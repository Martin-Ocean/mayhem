import type { MatchSummary } from "../../match/types";
import type { Highlight } from "../types";

const SHORT_GAME_SECONDS = 900; // 15 min
const LONG_GAME_SECONDS = 2100; // 35 min

export function detectDurationExtreme(summary: MatchSummary): Highlight[] {
  if (summary.gameDuration <= SHORT_GAME_SECONDS) {
    return [
      {
        type: "durationExtreme",
        weight: 15,
        participants: [],
        data: { direction: "short", gameDuration: summary.gameDuration },
      },
    ];
  }

  if (summary.gameDuration >= LONG_GAME_SECONDS) {
    return [
      {
        type: "durationExtreme",
        weight: 15,
        participants: [],
        data: { direction: "long", gameDuration: summary.gameDuration },
      },
    ];
  }

  return [];
}
