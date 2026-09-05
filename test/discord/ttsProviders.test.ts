import { afterEach, describe, expect, it, vi } from "vitest";
import { ElevenLabsTtsProvider } from "../../src/main/discord/providers/elevenLabsTts";
import { GoogleTtsProvider } from "../../src/main/discord/providers/googleTts";
import { createTtsProvider } from "../../src/main/discord/ttsProvider";

async function readAll(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

describe("ElevenLabsTtsProvider", () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it("posts to the given voice id with the api key header and returns the audio stream", async () => {
    const audioBytes = Buffer.from("fake-mp3-bytes");
    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      expect(url).toBe("https://api.elevenlabs.io/v1/text-to-speech/voice-123");
      expect((init.headers as Record<string, string>)["xi-api-key"]).toBe("test-key");
      expect(JSON.parse(init.body as string).text).toBe("hello team");
      return new Response(audioBytes, { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = new ElevenLabsTtsProvider("test-key", { voiceId: "voice-123" });
    const stream = await provider.synthesize("hello team");
    expect(await readAll(stream)).toEqual(audioBytes);
  });

  it("throws with response details on a non-OK response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("bad request", { status: 400 }))
    );

    const provider = new ElevenLabsTtsProvider("test-key");
    await expect(provider.synthesize("hi")).rejects.toThrow(/400/);
  });
});

describe("GoogleTtsProvider", () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it("posts text/voice/audioConfig and decodes the base64 audio content", async () => {
    const audioBytes = Buffer.from("fake-mp3-bytes");
    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      expect(url).toContain("key=test-key");
      const body = JSON.parse(init.body as string);
      expect(body.input.text).toBe("hello team");
      expect(body.voice.name).toBe("custom-voice");
      return new Response(JSON.stringify({ audioContent: audioBytes.toString("base64") }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = new GoogleTtsProvider("test-key", { voiceId: "custom-voice" });
    const stream = await provider.synthesize("hello team");
    expect(await readAll(stream)).toEqual(audioBytes);
  });
});

describe("createTtsProvider", () => {
  it("constructs the right provider class per config", () => {
    expect(createTtsProvider({ provider: "elevenlabs", apiKey: "x" })).toBeInstanceOf(ElevenLabsTtsProvider);
    expect(createTtsProvider({ provider: "google", apiKey: "x" })).toBeInstanceOf(GoogleTtsProvider);
  });
});
