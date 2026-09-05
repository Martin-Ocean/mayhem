import type { MatchSummary } from "../../match/types";
import type { Highlight } from "../types";

/**
 * Highest combined heal+shield-on-teammates, from the eog-stats-block fields — these aren't
 * in base match history, which is exactly why the eog block matters for this one.
 */
export function detectSupportMvp(summary: MatchSummary): Highlight[] {
  let best = summary.participants[0];
  let bestScore = 0;

  for (const p of summary.participants) {
    const score = p.totalHealsOnTeammates + p.totalDamageShieldedOnTeammates;
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }

  if (bestScore <= 0) return [];

  return [
    {
      type: "supportMvp",
      weight: 25 + Math.min(bestScore / 200, 30),
      participants: [best.puuid],
      data: {
        championName: best.championName,
        totalHealsOnTeammates: best.totalHealsOnTeammates,
        totalDamageShieldedOnTeammates: best.totalDamageShieldedOnTeammates,
      },
    },
  ];
}
