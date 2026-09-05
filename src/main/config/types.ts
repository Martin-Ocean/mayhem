import type { FriendMap } from "../match/types";
import type { Persona } from "../llm/types";
import type { CommentarySource } from "../llm/commentaryGenerator";
import type { TtsProviderName } from "../discord/ttsProvider";

export interface FeatureToggles {
  textEnabled: boolean;
  voiceEnabled: boolean;
}

/** Non-secret settings -- persisted to userData/config.json. */
export interface AppConfig {
  guildId?: string;
  textChannelId?: string;
  voiceChannelId?: string;
  friendMap: FriendMap;
  features: FeatureToggles;
  persona: Persona;
  commentarySource: CommentarySource;
  ttsProvider?: TtsProviderName;
  /** Capped, persisted GameStateMachine dedupe list so a restart mid-flow doesn't re-announce. */
  sentGameIds: number[];
}

export const DEFAULT_CONFIG: AppConfig = {
  friendMap: {},
  features: { textEnabled: true, voiceEnabled: true },
  persona: "roast",
  commentarySource: "template",
  sentGameIds: [],
};

/** Secrets -- persisted separately, always encrypted at rest. Never logged, never merged into AppConfig. */
export interface Secrets {
  discordBotToken?: string;
  anthropicApiKey?: string;
  ttsApiKey?: string;
}
