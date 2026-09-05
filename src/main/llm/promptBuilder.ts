import type { CommentaryInput, Persona } from "./types";
import { resolveDisplayName } from "./types";

export interface BuiltPrompt {
  system: string;
  user: string;
}

const PERSONA_DESCRIPTIONS: Record<Persona, string> = {
  roast: "Affectionate roast — teasing and sarcastic, but never genuinely mean.",
  hypeCaster: "Energetic esports caster — big reactions, hype, exclamation points.",
  deadpan: "Deadpan and dry — the humor is in the understatement.",
};

/**
 * Builds the prompt for AnthropicCommentaryGenerator (not yet implemented — see
 * anthropicGenerator.ts). Kept independent of any API call so it's cheaply unit-testable
 * (snapshot the output for a fixed Highlight[] input) without needing a live model.
 */
export function buildPrompt(input: CommentaryInput): BuiltPrompt {
  const system = [
    "You write short, funny commentary about a just-finished League of Legends match for a friend group's Discord server.",
    `Persona: ${PERSONA_DESCRIPTIONS[input.persona]}`,
    "Rules:",
    "- Be funny/insightful, not generic — reference the specific highlights and specific friends by name.",
    "- Affectionate roast energy is fine; never genuinely mean, never bring up anything outside this match.",
    "- spokenText must be plain text only: no markdown, no emoji, numbers spelled out where natural for speech, at most ~120 words.",
    "- embedBody may use markdown and emoji.",
    "- If isRemake is true, keep both fields short — nothing meaningful happened, don't force jokes about stats.",
    "- Respond only with the structured tool call output — no extra prose.",
  ].join("\n");

  const highlightsForPrompt = input.highlights.map((h) => ({
    type: h.type,
    names: h.participants.map((puuid) => resolveDisplayName(puuid, input)),
    ...h.data,
  }));

  const userPayload = {
    modeName: input.summary.modeName,
    gameDuration: input.summary.gameDuration,
    isRemake: input.summary.isRemake,
    endedInSurrender: input.summary.endedInSurrender,
    endedInEarlySurrender: input.summary.endedInEarlySurrender,
    highlights: highlightsForPrompt,
  };

  return { system, user: JSON.stringify(userPayload, null, 2) };
}
