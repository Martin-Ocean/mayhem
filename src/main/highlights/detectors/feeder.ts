import type { MatchSummary } from "../../match/types";
import type { Highlight } from "../types";
import { teamAverage } from "../teamStats";

/** Deaths at least 2x the team average, kills below team average. */
export function detectFeeder(summary: MatchSummary): Highlight[] {
  const highlights: Highlight[] = [];

  for (const p of summary.participants) {
    if (p.wasAfk || p.leaver) continue;

    const avgDeaths = teamAverage(summary, p.teamId, (x) => x.deaths);
    const avgKills = teamAverage(summary, p.teamId, (x) => x.kills);

    if (avgDeaths > 0 && p.deaths >= avgDeaths * 2 && p.kills < avgKills) {
      highlights.push({
        type: "feeder",
        weight: 35,
        participants: [p.puuid],
        data: { championName: p.championName, deaths: p.deaths, teamAverageDeaths: Math.round(avgDeaths) },
      });
    }
  }

  return highlights;
}
