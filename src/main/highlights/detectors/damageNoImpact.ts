import type { MatchSummary } from "../../match/types";
import type { Highlight } from "../types";
import { teamTotal } from "../teamStats";

const HIGH_DAMAGE_SHARE_THRESHOLD = 0.28;
const LOW_KILL_PARTICIPATION_THRESHOLD = 0.45;

/** High damage dealt but low kill participation — "all that damage and nothing to show for it." */
export function detectDamageNoImpact(summary: MatchSummary): Highlight[] {
  let best: { puuid: string; championName: string; damageShare: number } | null = null;

  for (const team of summary.teams) {
    const teamDamage = teamTotal(summary, team.teamId, (p) => p.damageDealtToChampions);
    const teamKills = teamTotal(summary, team.teamId, (p) => p.kills);
    if (teamDamage === 0 || teamKills === 0) continue;

    for (const p of summary.participants.filter((x) => x.teamId === team.teamId)) {
      const damageShare = p.damageDealtToChampions / teamDamage;
      const killParticipation = (p.kills + p.assists) / teamKills;

      if (
        damageShare >= HIGH_DAMAGE_SHARE_THRESHOLD &&
        killParticipation < LOW_KILL_PARTICIPATION_THRESHOLD &&
        (!best || damageShare > best.damageShare)
      ) {
        best = { puuid: p.puuid, championName: p.championName, damageShare };
      }
    }
  }

  if (!best) return [];

  return [
    {
      type: "damageNoImpact",
      weight: 20 + best.damageShare * 30,
      participants: [best.puuid],
      data: { championName: best.championName },
    },
  ];
}
