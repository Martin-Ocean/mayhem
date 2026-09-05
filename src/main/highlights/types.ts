export type HighlightType =
  | "multikill"
  | "carryMvp"
  | "worstPerformer"
  | "feeder"
  | "afkLeaver"
  | "firstBlood"
  | "stomp"
  | "nailBiter"
  | "damageNoImpact"
  | "visionOutlier"
  | "supportMvp"
  | "durationExtreme"
  | "remakeContext";

export interface Highlight {
  type: HighlightType;
  /** Higher weight = more interesting; engine ranks and truncates by this. */
  weight: number;
  /** puuids of participants this highlight is about. */
  participants: string[];
  data: Record<string, string | number | boolean>;
}

export type HighlightDetector = (summary: import("../match/types").MatchSummary) => Highlight[];
