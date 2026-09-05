import type { MatchSummary } from "../../match/types";
import type { Highlight } from "../types";

/**
 * "Int of the game" — weighted toward the losing team, highest deaths with low kill
 * participation. Excludes AFK/leaver players (afkLeaver.ts already flags them, and it's
 * not fair to also call someone a feeder for a disconnect).
 */
export function detectWorstPerformer(summary: MatchSummary): Highlight[] {
  const candidates = summary.participants.filter((p) => !p.wasAfk && !p.leaver);
  if (candidates.length === 0) return [];

  const losingTeamId = summary.teams.find((t) => !t.win)?.teamId;

  let worst = candidates[0];
  let worstScore = -Infinity;

  for (const p of candidates) {
    const teamPenalty = p.teamId === losingTeamId ? 1.3 : 1;
    const score = (p.deaths - p.kills * 0.5 - p.assists * 0.2) * teamPenalty;
    if (score > worstScore) {
      worstScore = score;
      worst = p;
    }
  }

  if (worstScore <= 0) return [];

  return [
    {
      type: "worstPerformer",
      weight: 30 + Math.min(worstScore * 4, 40),
      participants: [worst.puuid],
      data: {
        championName: worst.championName,
        kills: worst.kills,
        deaths: worst.deaths,
        assists: worst.assists,
      },
    },
  ];
}
