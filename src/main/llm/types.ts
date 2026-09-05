import type { MatchSummary } from "../match/types";
import type { Highlight } from "../highlights/types";

export type Persona = "roast" | "hypeCaster" | "deadpan";

/** puuid -> Discord display name, for substituting real names into commentary. */
export type FriendNameMap = Record<string, string>;

export interface CommentaryInput {
  summary: MatchSummary;
  highlights: Highlight[];
  friendNames: FriendNameMap;
  persona: Persona;
}

export interface CommentaryResult {
  title: string;
  /** Markdown — used for the Discord text embed. */
  embedBody: string;
  /** Plain text, no markdown/emoji — used for TTS voice playback. */
  spokenText: string;
}

export interface CommentaryGenerator {
  generate(input: CommentaryInput): Promise<CommentaryResult>;
}

export function resolveDisplayName(puuid: string, input: Pick<CommentaryInput, "summary" | "friendNames">): string {
  if (input.friendNames[puuid]) return input.friendNames[puuid];
  const participant = input.summary.participants.find((p) => p.puuid === puuid);
  return participant?.riotId.split("#")[0] ?? "Someone";
}
