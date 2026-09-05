import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildMatchSummary } from "../../src/main/match/normalize";
import { flattenEogStats } from "../../src/main/match/fetcher";
import { runHighlightEngine } from "../../src/main/highlights/engine";
import type { RawLcuGame } from "../../src/main/match/raw";
import type { ChampionMap, FriendMap } from "../../src/main/match/types";
import { buildTwoTeamSummary } from "./helpers";

const fixturesDir = join(__dirname, "..", "..", "fixtures");

function loadFixture<T>(name: string): T {
  return JSON.parse(readFileSync(join(fixturesDir, name), "utf-8")) as T;
}

describe("runHighlightEngine", () => {
  it("surfaces the pentakill, the AFK leaver, and the stomp from the sample match, ranked by weight", () => {
    const rawGame = loadFixture<RawLcuGame>("sample-aram-mayhem-match.json");
    const rawEog = loadFixture<Record<string, unknown>>("sample-eog-stats.json");
    const championMap = loadFixture<ChampionMap>("champion-map.json");
    const eogStats = flattenEogStats(rawEog as any);
    const summary = buildMatchSummary(rawGame, eogStats, championMap, {} as FriendMap);

    const highlights = runHighlightEngine(summary);

    expect(highlights[0].type).toBe("multikill"); // penta is the single highest-weighted detector output
    expect(highlights.some((h) => h.type === "afkLeaver")).toBe(true);
    expect(highlights.some((h) => h.type === "stomp")).toBe(true);
    expect(highlights.length).toBeLessThanOrEqual(6);
  });

  it("truncates to the requested top-N, highest weight first", () => {
    const rawGame = loadFixture<RawLcuGame>("sample-aram-mayhem-match.json");
    const rawEog = loadFixture<Record<string, unknown>>("sample-eog-stats.json");
    const championMap = loadFixture<ChampionMap>("champion-map.json");
    const eogStats = flattenEogStats(rawEog as any);
    const summary = buildMatchSummary(rawGame, eogStats, championMap, {} as FriendMap);

    const highlights = runHighlightEngine(summary, 2);
    expect(highlights).toHaveLength(2);
    expect(highlights[0].weight).toBeGreaterThanOrEqual(highlights[1].weight);
  });

  it("skips every stat-based detector and returns only remakeContext for a remade game", () => {
    const summary = buildTwoTeamSummary([{ pentaKills: 1 }], [{ wasAfk: true }], {
      isRemake: true,
      endedInEarlySurrender: true,
      gameDuration: 120,
    });

    const highlights = runHighlightEngine(summary);
    expect(highlights).toHaveLength(1);
    expect(highlights[0].type).toBe("remakeContext");
  });
});
