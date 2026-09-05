import type { MatchSummary } from "../../match/types";
import type { Highlight } from "../types";

const STOMP_RATIO = 0.4;
const NAIL_BITER_RATIO = 0.1;

/** Classifies the game as a stomp or a nail-biter based on the kill differential ratio. */
export function detectStompOrNailBiter(summary: MatchSummary): Highlight[] {
  if (summary.teams.length !== 2) return [];

  const [teamA, teamB] = summary.teams;
  const totalKills = teamA.totalKills + teamB.totalKills;
  if (totalKills === 0) return [];

  const diff = Math.abs(teamA.totalKills - teamB.totalKills);
  const ratio = diff / totalKills;
  const winningTeam = summary.teams.find((t) => t.win);

  if (ratio >= STOMP_RATIO) {
    return [
      {
        type: "stomp",
        weight: 30,
        participants: [],
        data: { killDiff: diff, winningTeamId: winningTeam?.teamId ?? 0 },
      },
    ];
  }

  if (ratio <= NAIL_BITER_RATIO) {
    return [
      {
        type: "nailBiter",
        weight: 30,
        participants: [],
        data: { killDiff: diff },
      },
    ];
  }

  return [];
}
