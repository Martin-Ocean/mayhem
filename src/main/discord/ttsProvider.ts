import type { Readable } from "node:stream";
import { ElevenLabsTtsProvider } from "./providers/elevenLabsTts";
import { GoogleTtsProvider } from "./providers/googleTts";

export interface TtsVoiceConfig {
  voiceId?: string;
}

export interface TtsProvider {
  /** Synthesizes `text` to speech; returns a readable audio stream (format documented per provider). */
  synthesize(text: string, voice?: TtsVoiceConfig): Promise<Readable>;
}

export type TtsProviderName = "elevenlabs" | "google";

export interface TtsProviderConfig {
  provider: TtsProviderName;
  apiKey: string;
  defaultVoice?: TtsVoiceConfig;
}

export function createTtsProvider(config: TtsProviderConfig): TtsProvider {
  switch (config.provider) {
    case "elevenlabs":
      return new ElevenLabsTtsProvider(config.apiKey, config.defaultVoice);
    case "google":
      return new GoogleTtsProvider(config.apiKey, config.defaultVoice);
    default:
      throw new Error(`Unknown TTS provider: ${config.provider satisfies never}`);
  }
}
