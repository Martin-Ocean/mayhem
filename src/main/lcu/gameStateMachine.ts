import { EventEmitter } from "node:events";
import type { LcuClient } from "./client";
import { EOG_PHASES, GameflowPhase, IN_GAME_PHASES } from "./phases";

interface GameflowSession {
  gameData?: { gameId?: number };
}

export interface GameStateEvents {
  gameEnded: (gameId: number) => void;
  error: (err: unknown) => void;
}

export declare interface GameStateMachine {
  on<K extends keyof GameStateEvents>(event: K, listener: GameStateEvents[K]): this;
  emit<K extends keyof GameStateEvents>(event: K, ...args: Parameters<GameStateEvents[K]>): boolean;
}

const MAX_TRACKED_GAME_IDS = 100;

/**
 * Tracks LCU gameflow-phase transitions and emits `gameEnded(gameId)` exactly once per
 * finished game, regardless of app restarts mid-flow (dedupe via a capped sent-game-id set).
 *
 * `Reconnect` is already an IN_GAME phase, so a disconnect/reconnect blip never falsely
 * triggers a game-end. Remake/early-surrender detection is intentionally NOT handled here —
 * it's derived later from match data in the normalizer, since it needs stats this state
 * machine doesn't have.
 */
export class GameStateMachine extends EventEmitter {
  private previousPhase: GameflowPhase | null = null;
  private currentGameId: number | null = null;
  private sentGameIds: number[];

  constructor(private readonly lcu: LcuClient, initialSentGameIds: number[] = []) {
    super();
    this.sentGameIds = [...initialSentGameIds];
    this.lcu.on("phase", (phase) => this.handlePhase(phase));
  }

  getSentGameIds(): number[] {
    return [...this.sentGameIds];
  }

  private wasInGame(phase: GameflowPhase | null): boolean {
    return phase !== null && IN_GAME_PHASES.has(phase);
  }

  private async handlePhase(phase: GameflowPhase): Promise<void> {
    const enteringGame = !this.wasInGame(this.previousPhase) && IN_GAME_PHASES.has(phase);
    const leavingGame = this.wasInGame(this.previousPhase) && !IN_GAME_PHASES.has(phase);

    if (enteringGame && this.currentGameId === null) {
      await this.captureCurrentGameId();
    }

    if (leavingGame) {
      this.finalizeGame();
    }

    this.previousPhase = phase;
  }

  private async captureCurrentGameId(): Promise<void> {
    try {
      const session = await this.lcu.request<GameflowSession>(
        "GET",
        "/lol-gameflow/v1/session"
      );
      const gameId = session.gameData?.gameId;
      if (typeof gameId === "number" && gameId > 0) {
        this.currentGameId = gameId;
      }
    } catch (err) {
      this.emit("error", err);
    }
  }

  private finalizeGame(): void {
    const gameId = this.currentGameId;
    this.currentGameId = null;
    if (gameId === null) return;
    if (this.sentGameIds.includes(gameId)) return;

    this.markSent(gameId);
    this.emit("gameEnded", gameId);
  }

  private markSent(gameId: number): void {
    this.sentGameIds.push(gameId);
    if (this.sentGameIds.length > MAX_TRACKED_GAME_IDS) {
      this.sentGameIds.splice(0, this.sentGameIds.length - MAX_TRACKED_GAME_IDS);
    }
  }
}

export { EOG_PHASES };
