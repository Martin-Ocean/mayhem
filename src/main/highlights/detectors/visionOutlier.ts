import type { MatchSummary, ParticipantSummary } from "../../match/types";
import type { Highlight } from "../types";
import { teamAverage } from "../teamStats";

const MIN_TEAM_AVERAGE_TO_CONSIDER = 5;
const LOW_RATIO = 0.4;
const HIGH_RATIO = 2.0;

/** Notably low or high vision score relative to team average (skipped if the whole team barely wards). */
export function detectVisionOutlier(summary: MatchSummary): Highlight[] {
  let mostExtreme: { p: ParticipantSummary; ratio: number; direction: "low" | "high" } | null = null;

  for (const team of summary.teams) {
    const avg = teamAverage(summary, team.teamId, (p) => p.visionScore);
    if (avg < MIN_TEAM_AVERAGE_TO_CONSIDER) continue;

    for (const p of summary.participants.filter((x) => x.teamId === team.teamId)) {
      const ratio = p.visionScore / avg;
      if (ratio <= LOW_RATIO) {
        const distance = LOW_RATIO - ratio;
        if (!mostExtreme || distance > Math.abs(mostExtreme.ratio - LOW_RATIO)) {
          mostExtreme = { p, ratio, direction: "low" };
        }
      } else if (ratio >= HIGH_RATIO) {
        if (!mostExtreme || ratio > mostExtreme.ratio) {
          mostExtreme = { p, ratio, direction: "high" };
        }
      }
    }
  }

  if (!mostExtreme) return [];

  return [
    {
      type: "visionOutlier",
      weight: 15,
      participants: [mostExtreme.p.puuid],
      data: {
        championName: mostExtreme.p.championName,
        direction: mostExtreme.direction,
        visionScore: mostExtreme.p.visionScore,
      },
    },
  ];
}
