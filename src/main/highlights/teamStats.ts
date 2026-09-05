import type { MatchSummary, ParticipantSummary } from "../match/types";

export function teammatesOf(summary: MatchSummary, p: ParticipantSummary): ParticipantSummary[] {
  return summary.participants.filter((other) => other.teamId === p.teamId);
}

export function teamTotal(
  summary: MatchSummary,
  teamId: number,
  pick: (p: ParticipantSummary) => number
): number {
  return summary.participants
    .filter((p) => p.teamId === teamId)
    .reduce((sum, p) => sum + pick(p), 0);
}

export function teamAverage(
  summary: MatchSummary,
  teamId: number,
  pick: (p: ParticipantSummary) => number
): number {
  const teammates = summary.participants.filter((p) => p.teamId === teamId);
  if (teammates.length === 0) return 0;
  return teamTotal(summary, teamId, pick) / teammates.length;
}

export function opposingTeamId(summary: MatchSummary, teamId: number): number | undefined {
  return summary.teams.find((t) => t.teamId !== teamId)?.teamId;
}
