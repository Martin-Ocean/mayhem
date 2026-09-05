import type { MatchSummary } from "../match/types";
import type { Highlight, HighlightDetector } from "./types";
import { detectMultikills } from "./detectors/multikill";
import { detectCarryMvp } from "./detectors/carryMvp";
import { detectWorstPerformer } from "./detectors/worstPerformer";
import { detectFeeder } from "./detectors/feeder";
import { detectAfkLeaver } from "./detectors/afkLeaver";
import { detectFirstBlood } from "./detectors/firstBlood";
import { detectStompOrNailBiter } from "./detectors/stomp";
import { detectDamageNoImpact } from "./detectors/damageNoImpact";
import { detectVisionOutlier } from "./detectors/visionOutlier";
import { detectSupportMvp } from "./detectors/supportMvp";
import { detectDurationExtreme } from "./detectors/durationExtreme";
import { detectRemakeContext } from "./detectors/remakeContext";

const DETECTORS: HighlightDetector[] = [
  detectMultikills,
  detectCarryMvp,
  detectWorstPerformer,
  detectFeeder,
  detectAfkLeaver,
  detectFirstBlood,
  detectStompOrNailBiter,
  detectDamageNoImpact,
  detectVisionOutlier,
  detectSupportMvp,
  detectDurationExtreme,
];

const DEFAULT_TOP_N = 6;

/**
 * Runs all rule-based detectors over a MatchSummary and returns the top-N highest-weighted
 * highlights, feeding the commentary generator something more specific than a raw stat dump.
 *
 * Remade/early-surrendered games are a special case: every stat-based detector is skipped
 * (nothing meaningful happened) and a single remakeContext highlight is returned instead.
 */
export function runHighlightEngine(summary: MatchSummary, topN: number = DEFAULT_TOP_N): Highlight[] {
  if (summary.isRemake) {
    return detectRemakeContext(summary);
  }

  const all = DETECTORS.flatMap((detector) => detector(summary));
  return all.sort((a, b) => b.weight - a.weight).slice(0, topN);
}

export { DETECTORS };
