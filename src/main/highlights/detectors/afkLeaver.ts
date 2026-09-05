import type { MatchSummary } from "../../match/types";
import type { Highlight } from "../types";

/** Highest-severity flag — overrides other snark about this player when present. */
export function detectAfkLeaver(summary: MatchSummary): Highlight[] {
  return summary.participants
    .filter((p) => p.wasAfk || p.leaver)
    .map((p) => ({
      type: "afkLeaver" as const,
      weight: 90,
      participants: [p.puuid],
      data: { championName: p.championName, leaver: p.leaver, wasAfk: p.wasAfk },
    }));
}
