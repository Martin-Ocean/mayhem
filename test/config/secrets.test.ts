import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SecretsStore, type SecretsCodec } from "../../src/main/config/secrets";

/** Reversible fake codec standing in for Electron's safeStorage in tests. */
const fakeCodec: SecretsCodec = {
  encrypt: (plainText) => Buffer.from(`enc:${plainText}`),
  decrypt: (cipherText) => cipherText.toString("utf-8").replace(/^enc:/, ""),
};

let dir: string;

afterEach(async () => {
  if (dir) await rm(dir, { recursive: true, force: true });
});

describe("SecretsStore", () => {
  it("returns an empty object when the file doesn't exist yet", async () => {
    dir = await mkdtemp(join(tmpdir(), "hex-aram-secrets-"));
    const store = new SecretsStore(join(dir, "secrets.json"), fakeCodec);
    expect(await store.load()).toEqual({});
  });

  it("round-trips secrets through the codec", async () => {
    dir = await mkdtemp(join(tmpdir(), "hex-aram-secrets-"));
    const store = new SecretsStore(join(dir, "secrets.json"), fakeCodec);

    await store.save({ discordBotToken: "bot-token-123", anthropicApiKey: "sk-abc" });
    const loaded = await store.load();

    expect(loaded.discordBotToken).toBe("bot-token-123");
    expect(loaded.anthropicApiKey).toBe("sk-abc");
  });

  it("never writes plaintext secret values to disk", async () => {
    dir = await mkdtemp(join(tmpdir(), "hex-aram-secrets-"));
    const filePath = join(dir, "secrets.json");
    const store = new SecretsStore(filePath, fakeCodec);

    await store.save({ discordBotToken: "super-secret-token" });
    const raw = await readFile(filePath, "utf-8");

    expect(raw).not.toContain("super-secret-token");
  });
});
