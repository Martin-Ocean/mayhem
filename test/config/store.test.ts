import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ConfigStore } from "../../src/main/config/store";
import { DEFAULT_CONFIG } from "../../src/main/config/types";

let dir: string;

afterEach(async () => {
  if (dir) await rm(dir, { recursive: true, force: true });
});

describe("ConfigStore", () => {
  it("returns default config when the file doesn't exist yet", async () => {
    dir = await mkdtemp(join(tmpdir(), "hex-aram-config-"));
    const store = new ConfigStore(join(dir, "config.json"));
    const config = await store.load();
    expect(config).toEqual(DEFAULT_CONFIG);
  });

  it("round-trips a saved config, merging with defaults for missing fields", async () => {
    dir = await mkdtemp(join(tmpdir(), "hex-aram-config-"));
    const store = new ConfigStore(join(dir, "config.json"));

    await store.save({ ...DEFAULT_CONFIG, guildId: "guild-1", sentGameIds: [1, 2, 3] });
    const loaded = await store.load();

    expect(loaded.guildId).toBe("guild-1");
    expect(loaded.sentGameIds).toEqual([1, 2, 3]);
    expect(loaded.persona).toBe(DEFAULT_CONFIG.persona);
  });

  it("writes atomically via a temp file + rename, leaving no .tmp file behind", async () => {
    dir = await mkdtemp(join(tmpdir(), "hex-aram-config-"));
    const store = new ConfigStore(join(dir, "config.json"));
    await store.save({ ...DEFAULT_CONFIG, guildId: "guild-2" });

    const { readdir } = await import("node:fs/promises");
    const files = await readdir(dir);
    expect(files).toEqual(["config.json"]);
  });
});
