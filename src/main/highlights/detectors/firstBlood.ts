import type { MatchSummary } from "../../match/types";
import type { Highlight } from "../types";

export function detectFirstBlood(summary: MatchSummary): Highlight[] {
  const killer = summary.participants.find((p) => p.firstBloodKill);
  if (!killer) return [];

  return [
    {
      type: "firstBlood",
      weight: 25,
      participants: [killer.puuid],
      data: { championName: killer.championName },
    },
  ];
}
