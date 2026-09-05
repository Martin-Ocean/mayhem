import { Readable } from "node:stream";
import type { TtsProvider, TtsVoiceConfig } from "../ttsProvider";

const DEFAULT_VOICE_NAME = "en-US-Neural2-D";
const DEFAULT_LANGUAGE_CODE = "en-US";

interface GoogleTtsResponse {
  audioContent: string; // base64-encoded MP3
}

/** Free-tier fallback: more generic voice quality, no ongoing cost at small friend-group volume. */
export class GoogleTtsProvider implements TtsProvider {
  constructor(private readonly apiKey: string, private readonly defaultVoice?: TtsVoiceConfig) {}

  async synthesize(text: string, voice?: TtsVoiceConfig): Promise<Readable> {
    const voiceName = voice?.voiceId ?? this.defaultVoice?.voiceId ?? DEFAULT_VOICE_NAME;

    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${this.apiKey}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          input: { text },
          voice: { languageCode: DEFAULT_LANGUAGE_CODE, name: voiceName },
          audioConfig: { audioEncoding: "MP3" },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Google TTS request failed: ${response.status} ${await response.text()}`);
    }

    const { audioContent } = (await response.json()) as GoogleTtsResponse;
    return Readable.from(Buffer.from(audioContent, "base64"));
  }
}
