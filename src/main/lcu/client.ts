import { EventEmitter } from "node:events";
import {
  authenticate,
  request as lcuRequest,
  connect as connectLcuWebSocket,
  type Credentials,
  type LeagueWebSocket,
} from "league-connect";
import {
  credentialsFromEnvOverride,
  discoverFromProcessCommandLine,
  type LcuCredentials,
} from "./discovery";
import { GameflowPhase, POLL_FALLBACK_INTERVAL_MS, RECONNECT_RETRY_MS } from "./phases";

export interface LcuClientEvents {
  connected: () => void;
  disconnected: () => void;
  phase: (phase: GameflowPhase) => void;
  error: (err: unknown) => void;
}

export declare interface LcuClient {
  on<K extends keyof LcuClientEvents>(event: K, listener: LcuClientEvents[K]): this;
  emit<K extends keyof LcuClientEvents>(event: K, ...args: Parameters<LcuClientEvents[K]>): boolean;
}

type ResolvedCredentials =
  | { mode: "league-connect"; credentials: Credentials }
  | { mode: "override"; credentials: LcuCredentials };

/**
 * Thin wrapper around `league-connect` so the rest of the app never imports it directly.
 * Prefers the LCU's push-based websocket for phase changes; falls back to REST polling
 * behind the same `phase` event if the websocket subscription proves unreliable.
 *
 * In dev/test override mode (LCU_BASE_OVERRIDE/LCU_TOKEN_OVERRIDE, e.g. pointing at
 * scripts/mock-lcu-server.ts) requests go over plain fetch instead of league-connect, since
 * league-connect assumes talking to a real HTTPS LCU with its self-signed cert, and the
 * websocket subscription is skipped entirely in favor of REST polling.
 */
export interface LcuClientOptions {
  /** Overrides the REST polling-fallback interval; mainly for tests. Defaults to POLL_FALLBACK_INTERVAL_MS. */
  pollIntervalMs?: number;
}

export class LcuClient extends EventEmitter {
  private resolved: ResolvedCredentials | null = null;
  private ws: LeagueWebSocket | null = null;
  private pollTimer: NodeJS.Timeout | null = null;
  private lastPhase: GameflowPhase | null = null;
  private stopped = false;

  constructor(private readonly options: LcuClientOptions = {}) {
    super();
  }

  async connect(): Promise<void> {
    this.stopped = false;
    await this.attemptConnect();
  }

  stop(): void {
    this.stopped = true;
    this.teardown();
  }

  getLastPhase(): GameflowPhase | null {
    return this.lastPhase;
  }

  async request<T = unknown>(method: string, url: string): Promise<T> {
    if (!this.resolved) throw new Error("LcuClient is not connected");

    if (this.resolved.mode === "override") {
      return this.requestOverride<T>(method, url, this.resolved.credentials);
    }
    return this.requestLeagueConnect<T>(method, url, this.resolved.credentials);
  }

  private async requestLeagueConnect<T>(
    method: string,
    url: string,
    credentials: Credentials
  ): Promise<T> {
    const response = await lcuRequest<unknown, T>({ method: method as any, url }, credentials);
    if (response.status === 404) throw new LcuNotFoundError(url);
    if (response.status >= 400) {
      throw new Error(`LCU request failed: ${method} ${url} -> ${response.status}`);
    }
    if (response.status === 204) return undefined as T;
    return response.json();
  }

  private async requestOverride<T>(
    method: string,
    url: string,
    creds: LcuCredentials
  ): Promise<T> {
    const base = `${creds.protocol}://${creds.address}:${creds.port}`;
    const response = await fetch(base + url, {
      method,
      headers: {
        Authorization: "Basic " + Buffer.from(`riot:${creds.password}`).toString("base64"),
      },
    });
    if (response.status === 404) throw new LcuNotFoundError(url);
    if (response.status >= 400) {
      throw new Error(`LCU request failed: ${method} ${url} -> ${response.status}`);
    }
    const text = await response.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  private async attemptConnect(): Promise<void> {
    try {
      this.resolved = await this.resolveCredentials();
      if (this.resolved.mode === "override") {
        this.startPollingFallback();
      } else {
        await this.startWebSocket(this.resolved.credentials);
      }
      this.emit("connected");
      await this.pollOnce();
    } catch (err) {
      this.emit("error", err);
      if (!this.stopped) {
        setTimeout(() => this.attemptConnect(), RECONNECT_RETRY_MS);
      }
    }
  }

  private async resolveCredentials(): Promise<ResolvedCredentials> {
    const override = credentialsFromEnvOverride();
    if (override) return { mode: "override", credentials: override };

    try {
      const credentials = await authenticate({ awaitConnection: true, pollInterval: 1000 });
      return { mode: "league-connect", credentials };
    } catch (err) {
      const fallback = await discoverFromProcessCommandLine();
      if (fallback) {
        return {
          mode: "league-connect",
          credentials: { port: fallback.port, password: fallback.password, pid: 0 } as Credentials,
        };
      }
      throw err;
    }
  }

  private async startWebSocket(credentials: Credentials): Promise<void> {
    try {
      const ws = await connectLcuWebSocket(credentials);
      ws.subscribe<GameflowPhase>("/lol-gameflow/v1/gameflow-phase", (data) => {
        if (typeof data === "string") this.handlePhase(data);
      });

      ws.on("close", () => {
        this.ws = null;
        this.emit("disconnected");
        this.startPollingFallback();
      });
      ws.on("error", (err) => this.emit("error", err));

      this.ws = ws;
    } catch (err) {
      this.emit("error", err);
      this.startPollingFallback();
    }
  }

  private startPollingFallback(): void {
    if (this.pollTimer || this.stopped) return;
    this.pollTimer = setInterval(() => {
      this.pollOnce().catch((err) => this.emit("error", err));
    }, this.options.pollIntervalMs ?? POLL_FALLBACK_INTERVAL_MS);
  }

  private async pollOnce(): Promise<void> {
    if (!this.resolved) return;
    try {
      const phase = await this.request<GameflowPhase>(
        "GET",
        "/lol-gameflow/v1/gameflow-phase"
      );
      this.handlePhase(phase);
    } catch (err) {
      this.emit("error", err);
    }
  }

  private handlePhase(phase: GameflowPhase): void {
    if (phase === this.lastPhase) return;
    this.lastPhase = phase;
    this.emit("phase", phase);
  }

  private teardown(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.resolved = null;
    this.lastPhase = null;
  }
}

export class LcuNotFoundError extends Error {
  constructor(url: string) {
    super(`LCU resource not found: ${url}`);
    this.name = "LcuNotFoundError";
  }
}
