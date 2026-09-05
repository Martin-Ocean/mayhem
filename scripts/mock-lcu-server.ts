/**
 * Fake LCU server for local dev/testing without League installed.
 *
 * Serves canned gameflow-phase / session / match-history / eog-stats-block responses from
 * fixtures/, with a /control/* endpoint to flip phase and gameId on demand. Point the app at
 * it with:
 *   LCU_BASE_OVERRIDE=http://127.0.0.1:9999 LCU_TOKEN_OVERRIDE=dev npm run mock-lcu
 *
 * Then, in another terminal, drive it through a fake match:
 *   curl -X POST localhost:9999/control/phase -d '{"phase":"InProgress"}' -H 'content-type: application/json'
 *   curl -X POST localhost:9999/control/game-id -d '{"gameId":5301234567}' -H 'content-type: application/json'
 *   curl -X POST localhost:9999/control/phase -d '{"phase":"EndOfGame"}' -H 'content-type: application/json'
 *
 * Also exported as createMockLcuApp() for in-process integration tests (see
 * test/integration/pipeline.test.ts) so the whole detection pipeline can be exercised
 * against a real HTTP round trip without spawning a subprocess.
 */
import express, { type Express } from "express";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const fixturesDir = join(__dirname, "..", "fixtures");

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(join(fixturesDir, name), "utf-8"));
}

export function createMockLcuApp(): { app: Express; fixtureGameId: number } {
  const rawGame = loadFixture("sample-aram-mayhem-match.json") as { gameId: number };
  const rawEog = loadFixture("sample-eog-stats.json");

  let currentPhase = "None";
  let currentGameId: number | null = null;

  const app = express();
  app.use(express.json());

  app.get("/lol-gameflow/v1/gameflow-phase", (_req, res) => {
    res.json(currentPhase);
  });

  app.get("/lol-gameflow/v1/session", (_req, res) => {
    res.json({ gameData: { gameId: currentGameId ?? 0 } });
  });

  app.get("/lol-match-history/v1/games/:gameId", (req, res) => {
    const requested = Number(req.params.gameId);
    if (requested !== rawGame.gameId) {
      res.status(404).json({ message: "not found" });
      return;
    }
    res.json(rawGame);
  });

  app.get("/lol-end-of-game/v1/eog-stats-block", (_req, res) => {
    res.json(rawEog);
  });

  app.post("/control/phase", (req, res) => {
    currentPhase = req.body.phase;
    console.log(`[mock-lcu] phase -> ${currentPhase}`);
    res.json({ ok: true, phase: currentPhase });
  });

  app.post("/control/game-id", (req, res) => {
    currentGameId = req.body.gameId;
    console.log(`[mock-lcu] gameId -> ${currentGameId}`);
    res.json({ ok: true, gameId: currentGameId });
  });

  return { app, fixtureGameId: rawGame.gameId };
}

if (require.main === module) {
  const PORT = 9999;
  const { app, fixtureGameId } = createMockLcuApp();
  app.listen(PORT, () => {
    console.log(`[mock-lcu] listening on http://127.0.0.1:${PORT}`);
    console.log(`[mock-lcu] fixture gameId: ${fixtureGameId}`);
  });
}
