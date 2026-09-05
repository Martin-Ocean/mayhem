/**
 * Dry-run CLI: drives a captured (or fixture) raw LCU match through the pipeline without a
 * live game. Currently covers normalize (highlights/commentary land in later phases and will
 * extend this same script rather than replacing it).
 *
 * Usage:
 *   npm run replay -- --game fixtures/sample-aram-mayhem-match.json --eog fixtures/sample-eog-stats.json
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildMatchSummary } from "../src/main/match/normalize";
import { flattenEogStats } from "../src/main/match/fetcher";
import type { RawLcuGame } from "../src/main/match/raw";
import type { ChampionMap, FriendMap } from "../src/main/match/types";

function arg(name: string, fallback: string): string {
  const idx = process.argv.indexOf(`--${name}`);
  return idx !== -1 && process.argv[idx + 1] ? process.argv[idx + 1] : fallback;
}

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

const fixturesDir = join(__dirname, "..", "fixtures");
const gamePath = arg("game", join(fixturesDir, "sample-aram-mayhem-match.json"));
const eogPath = arg("eog", join(fixturesDir, "sample-eog-stats.json"));
const championsPath = arg("champions", join(fixturesDir, "champion-map.json"));
const friendsPath = arg("friends", "");

const rawGame = loadJson<RawLcuGame>(gamePath);
const rawEog = loadJson<Record<string, unknown>>(eogPath);
const championMap = loadJson<ChampionMap>(championsPath);
const friendMap = friendsPath ? loadJson<FriendMap>(friendsPath) : ({} as FriendMap);

const eogStats = flattenEogStats(rawEog as any);
const summary = buildMatchSummary(rawGame, eogStats, championMap, friendMap);

console.log(`\n=== ${summary.modeName} — ${summary.gameDuration}s — game ${summary.gameId} ===`);
if (summary.isRemake) console.log("(remake — short game / early surrender)");

for (const team of summary.teams) {
  console.log(`\nTeam ${team.teamId} (${team.win ? "WIN" : "LOSS"}) — ${team.totalKills} kills, ${team.totalGold} gold`);
  for (const p of summary.participants.filter((p) => p.teamId === team.teamId)) {
    const flags = [
      p.pentaKills ? "PENTA" : null,
      p.wasAfk ? "AFK" : null,
      p.leaver ? "LEAVER" : null,
      p.firstBloodKill ? "FIRST BLOOD" : null,
    ]
      .filter(Boolean)
      .join(" ");
    console.log(
      `  ${p.riotId.padEnd(20)} ${p.championName.padEnd(10)} ${p.kills}/${p.deaths}/${p.assists}` +
        ` (${p.kda.toFixed(2)} KDA)  gold=${p.goldEarned}  dmg=${p.damageDealtToChampions}  ${flags}`
    );
  }
}

if (summary.trackedParticipants.length > 0) {
  console.log(`\nTracked friends: ${summary.trackedParticipants.map((t) => t.discordName).join(", ")}`);
}

console.log("\n(highlights + commentary generation land in a later build phase)\n");
