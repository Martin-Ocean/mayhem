import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildMatchSummary } from "../../src/main/match/normalize";
import { flattenEogStats } from "../../src/main/match/fetcher";
import type { RawLcuGame } from "../../src/main/match/raw";
import type { ChampionMap, FriendMap } from "../../src/main/match/types";

const fixturesDir = join(__dirname, "..", "..", "fixtures");

function loadFixture<T>(name: string): T {
  return JSON.parse(readFileSync(join(fixturesDir, name), "utf-8")) as T;
}

const rawGame = loadFixture<RawLcuGame>("sample-aram-mayhem-match.json");
const rawEog = loadFixture<{ players: Array<Record<string, unknown>> }>("sample-eog-stats.json");
const championMap = loadFixture<ChampionMap>("champion-map.json");
const friendMap: FriendMap = {
  "puuid-alice": "alice#discord",
  "puuid-bob": "bob#discord",
};

describe("buildMatchSummary", () => {
  const eogStats = flattenEogStats(rawEog);
  const summary = buildMatchSummary(rawGame, eogStats, championMap, friendMap);

  it("maps top-level match fields, including ARAM Mayhem mode name resolution", () => {
    expect(summary.gameId).toBe(5301234567);
    expect(summary.queueId).toBe(2400);
    expect(summary.modeName).toBe("ARAM Mayhem");
    expect(summary.isRemake).toBe(false);
  });

  it("produces one ParticipantSummary per raw participant with derived fields", () => {
    expect(summary.participants).toHaveLength(10);
    const alice = summary.participants.find((p) => p.puuid === "puuid-alice")!;
    expect(alice.championName).toBe("Sett");
    expect(alice.kills).toBe(18);
    expect(alice.pentaKills).toBe(1);
    expect(alice.kda).toBeCloseTo((18 + 9) / 3);
  });

  it("merges eog-stats-block fields onto the matching participant by puuid", () => {
    const bob = summary.participants.find((p) => p.puuid === "puuid-bob")!;
    expect(bob.totalHealsOnTeammates).toBe(4200);
    expect(bob.totalDamageShieldedOnTeammates).toBe(1800);

    const ivan = summary.participants.find((p) => p.puuid === "puuid-ivan")!;
    expect(ivan.wasAfk).toBe(true);
    expect(ivan.leaver).toBe(true);
  });

  it("leaves eog-only fields at zero/false for participants absent from the eog block", () => {
    const carol = summary.participants.find((p) => p.puuid === "puuid-carol")!;
    expect(carol.totalHealsOnTeammates).toBe(0);
    expect(carol.wasAfk).toBe(false);
  });

  it("computes team aggregates from participant stats plus raw objective fields", () => {
    const blueTeam = summary.teams.find((t) => t.teamId === 100)!;
    expect(blueTeam.win).toBe(true);
    expect(blueTeam.totalKills).toBe(18 + 3 + 6 + 9 + 2);
    expect(blueTeam.towerKills).toBe(5);
  });

  it("only includes participants present in the friend map as trackedParticipants", () => {
    expect(summary.trackedParticipants).toHaveLength(2);
    expect(summary.trackedParticipants.map((t) => t.discordName).sort()).toEqual([
      "alice#discord",
      "bob#discord",
    ]);
  });

  it("flags a remake for a very short game even without an explicit early-surrender flag", () => {
    const shortGame: RawLcuGame = { ...rawGame, gameDuration: 120 };
    const shortSummary = buildMatchSummary(shortGame, eogStats, championMap, friendMap);
    expect(shortSummary.isRemake).toBe(true);
  });
});

describe("flattenEogStats", () => {
  it("returns an empty map for undefined input", () => {
    expect(flattenEogStats(undefined)).toEqual({});
  });

  it("flattens a top-level players array keyed by puuid", () => {
    const result = flattenEogStats(rawEog);
    expect(result["puuid-judy"].totalHeal).toBe(3800);
  });

  it("flattens a nested teams[].players[] shape", () => {
    const nested = {
      teams: [{ players: [{ puuid: "x", totalHeal: 10 }] }, { players: [{ puuid: "y", totalHeal: 20 }] }],
    };
    const result = flattenEogStats(nested);
    expect(result.x.totalHeal).toBe(10);
    expect(result.y.totalHeal).toBe(20);
  });
});
