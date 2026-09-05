import type { MatchSummary } from "../../match/types";
import type { Highlight } from "../types";
import { teamTotal } from "../teamStats";

/**
 * Unofficial MVP: highest combined score of kill participation, damage share, and gold
 * share among the winning team. Tie-broken implicitly by score since ties are vanishingly
 * rare with real stats.
 */
export function detectCarryMvp(summary: MatchSummary): Highlight[] {
  const winningTeam = summary.teams.find((t) => t.win);
  if (!winningTeam) return [];

  const winners = summary.participants.filter((p) => p.teamId === winningTeam.teamId);
  if (winners.length === 0) return [];

  const teamKills = teamTotal(summary, winningTeam.teamId, (p) => p.kills);
  const teamDamage = teamTotal(summary, winningTeam.teamId, (p) => p.damageDealtToChampions);
  const teamGold = teamTotal(summary, winningTeam.teamId, (p) => p.goldEarned);

  let best = winners[0];
  let bestScore = -Infinity;

  for (const p of winners) {
    const killParticipation = teamKills > 0 ? (p.kills + p.assists) / teamKills : 0;
    const damageShare = teamDamage > 0 ? p.damageDealtToChampions / teamDamage : 0;
    const goldShare = teamGold > 0 ? p.goldEarned / teamGold : 0;
    const score = killParticipation * 0.4 + damageShare * 0.4 + goldShare * 0.2;

    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }

  return [
    {
      type: "carryMvp",
      weight: 60 + bestScore * 40,
      participants: [best.puuid],
      data: {
        championName: best.championName,
        kills: best.kills,
        deaths: best.deaths,
        assists: best.assists,
      },
    },
  ];
}
