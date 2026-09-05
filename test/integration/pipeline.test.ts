import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createMockLcuApp } from "../../scripts/mock-lcu-server";
import { LcuClient } from "../../src/main/lcu/client";
import { GameStateMachine } from "../../src/main/lcu/gameStateMachine";
import { MatchFetcher } from "../../src/main/match/fetcher";

/**
 * Exercises the real wiring (LcuClient -> GameStateMachine -> MatchFetcher) against an
 * in-process HTTP server, proving the whole detection pipeline works without a real League
 * client installed — the same override mechanism scripts/mock-lcu-server.ts documents for
 * manual dev use, but driven end-to-end and asserted on automatically.
 */
describe("detection pipeline against a mock LCU server", () => {
  let server: Server;
  let fixtureGameId: number;
  let lcu: LcuClient;

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
  });

  afterEach(async () => {
    lcu.stop();
    delete process.env.LCU_BASE_OVERRIDE;
    delete process.env.LCU_TOKEN_OVERRIDE;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("detects game end via phase transition and fetches the finished match", async () => {
    const stateMachine = new GameStateMachine(lcu);
    const gameEnded = new Promise<number>((resolve) => {
      stateMachine.on("gameEnded", resolve);
    });

    await postControl("phase", { phase: "ChampSelect" });
    await postControl("game-id", { gameId: fixtureGameId });
    await postControl("phase", { phase: "InProgress" });
    await sleep(150); // let the state machine capture currentGameId from /session
    await postControl("phase", { phase: "EndOfGame" });

    const endedGameId = await withTimeout(gameEnded, 3000, "gameEnded was never emitted");
    expect(endedGameId).toBe(fixtureGameId);

    const fetcher = new MatchFetcher(lcu);
    const { rawGame, eogStats } = await fetcher.fetchMatch(endedGameId);
    expect(rawGame.gameId).toBe(fixtureGameId);
    expect(eogStats["puuid-ivan"].leaver).toBe(true);
  }, 10_000);

  it("does not re-emit gameEnded for a game id already marked sent", async () => {
    const stateMachine = new GameStateMachine(lcu, [fixtureGameId]);
    let emitted = false;
    stateMachine.on("gameEnded", () => (emitted = true));

    await postControl("phase", { phase: "ChampSelect" });
    await postControl("game-id", { gameId: fixtureGameId });
    await postControl("phase", { phase: "InProgress" });
    await sleep(150);
    await postControl("phase", { phase: "EndOfGame" });
    await sleep(150);

    expect(emitted).toBe(false);
  }, 10_000);

  async function postControl(path: string, body: unknown): Promise<void> {
    const base = process.env.LCU_BASE_OVERRIDE!;
    await fetch(`${base}/control/${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ]);
}
