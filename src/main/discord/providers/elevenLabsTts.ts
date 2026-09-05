import { Readable } from "node:stream";
import type { TtsProvider, TtsVoiceConfig } from "../ttsProvider";

const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // ElevenLabs' default "Rachel" voice
const DEFAULT_MODEL_ID = "eleven_turbo_v2_5";

/** Best voice quality/personality for comedic delivery; usage-based cost per character. */
export class ElevenLabsTtsProvider implements TtsProvider {
  constructor(private readonly apiKey: string, private readonly defaultVoice?: TtsVoiceConfig) {}

  async synthesize(text: string, voice?: TtsVoiceConfig): Promise<Readable> {
    const voiceId = voice?.voiceId ?? this.defaultVoice?.voiceId ?? DEFAULT_VOICE_ID;

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": this.apiKey,
        "content-type": "application/json",
        accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: DEFAULT_MODEL_ID,
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error(`ElevenLabs TTS request failed: ${response.status} ${await response.text()}`);
    }

    return Readable.fromWeb(response.body as any);
  }
}
