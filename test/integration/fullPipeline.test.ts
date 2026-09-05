import { describe, expect, it, afterEach, beforeEach } from "vitest";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createMockLcuApp } from "../../scripts/mock-lcu-server";
import { LcuClient } from "../../src/main/lcu/client";
import { GameStateMachine } from "../../src/main/lcu/gameStateMachine";
import { ConfigStore } from "../../src/main/config/store";
import { SecretsStore, type SecretsCodec } from "../../src/main/config/secrets";
import { DEFAULT_CONFIG } from "../../src/main/config/types";
import { Pipeline } from "../../src/main/pipeline";
import { StatusBus } from "../../src/main/statusBus";
import type { BotClient } from "../../src/main/discord/botClient";
import championMap from "../../fixtures/champion-map.json";

const identityCodec: SecretsCodec = {
  encrypt: (s) => Buffer.from(s),
  decrypt: (b) => b.toString("utf-8"),
};

/**
 * Exercises the full wiring -- LCU detection through to a (faked) Discord text send -- proving
 * the pipeline's config-driven glue works end to end. Voice delivery is left off so this never
 * needs a real Discord bot login; voiceDelivery/textDelivery's own units are tested elsewhere.
 */
describe("Pipeline (text-only, no real Discord)", () => {
  let server: Server;
  let fixtureGameId: number;
  let lcu: LcuClient;
  let dir: string;

  beforeEach(async () => {
    const { app, fixtureGameId: gameId } = createMockLcuApp();
    fixtureGameId = gameId;
    server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as AddressInfo).port;

    process.env.LCU_BASE_OVERRIDE = `http://127.0.0.1:${port}`;
    process.env.LCU_TOKEN_OVERRIDE = "test-token";

    lcu = new LcuClient({ pollIntervalMs: 30 });
    await lcu.connect();

    dir = await mkdtemp(join(tmpdir(), "hex-aram-pipeline-"));
  });

  afterEach(async () => {
    lcu.stop();
    delete process.env.LCU_BASE_OVERRIDE;
    delete process.env.LCU_TOKEN_OVERRIDE;
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(dir, { recursive: true, force: true });
  });

  it("detects the game end, generates commentary, and sends a text announcement", async () => {
    const configStore = new ConfigStore(join(dir, "config.json"));
    await configStore.save({
      ...DEFAULT_CONFIG,
      guildId: "guild-1",
      textChannelId: "channel-1",
      features: { textEnabled: true, voiceEnabled: false },
      friendMap: { "puuid-alice": "Alice" },
    });
    const secretsStore = new SecretsStore(join(dir, "secrets.json"), identityCodec);

    const sentMessages: unknown[] = [];
    const fakeChannel = {
      isSendable: () => true,
      send: async (payload: unknown) => {
        sentMessages.push(payload);
      },
    };
    const fakeBotClient = {
      getTextChannel: async (channelId: string) => {
        expect(channelId).toBe("channel-1");
        return fakeChannel;
      },
    } as unknown as BotClient;

    const statusBus = new StatusBus();
    const announced = new Promise<{ gameId: number }>((resolve) => {
      statusBus.on("announced", resolve as any);
    });
    statusBus.on("error", (err) => {
      throw err;
    });

    const stateMachine = new GameStateMachine(lcu);
    new Pipeline({
      lcu,
      stateMachine,
      configStore,
      secretsStore,
      botClient: fakeBotClient,
      championMap: championMap as Record<number, string>,
      statusBus,
    });

    await postControl(`http://127.0.0.1:${new URL(process.env.LCU_BASE_OVERRIDE!).port}`, "phase", {
      phase: "ChampSelect",
    });
    await postControl(process.env.LCU_BASE_OVERRIDE!, "game-id", { gameId: fixtureGameId });
    await postControl(process.env.LCU_BASE_OVERRIDE!, "phase", { phase: "InProgress" });
    await sleep(150);
    await postControl(process.env.LCU_BASE_OVERRIDE!, "phase", { phase: "EndOfGame" });

    const result = await withTimeout(announced, 5000, "pipeline never announced");
    expect(result.gameId).toBe(fixtureGameId);
    expect(sentMessages).toHaveLength(1);

    const savedConfig = await configStore.load();
    expect(savedConfig.sentGameIds).toContain(fixtureGameId);
  }, 10_000);
});

async function postControl(base: string, path: string, body: unknown): Promise<void> {
  await fetch(`${base}/control/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ]);
}
