import type { MatchSummary } from "../../match/types";
import type { Highlight } from "../types";

/**
 * Not competing for a top-N slot like other detectors — the engine returns this alone,
 * skipping every stat-based detector, since stats from a remade/early-surrendered game
 * aren't meaningful to joke about.
 */
export function detectRemakeContext(summary: MatchSummary): Highlight[] {
  return [
    {
      type: "remakeContext",
      weight: 100,
      participants: [],
      data: {
        endedInEarlySurrender: summary.endedInEarlySurrender,
        gameDuration: summary.gameDuration,
      },
    },
  ];
}
