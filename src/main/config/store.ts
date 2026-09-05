import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { AppConfig, DEFAULT_CONFIG } from "./types";

/**
 * Non-secret settings persistence. `filePath` is injected (rather than hardcoded to
 * Electron's userData dir) so this is trivially unit-testable with a temp file.
 */
export class ConfigStore {
  constructor(private readonly filePath: string) {}

  async load(): Promise<AppConfig> {
    try {
      const raw = await readFile(this.filePath, "utf-8");
      return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULT_CONFIG };
    }
  }

  async save(config: AppConfig): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const tempPath = `${this.filePath}.tmp`;
    await writeFile(tempPath, JSON.stringify(config, null, 2), "utf-8");
    await rename(tempPath, this.filePath);
  }
}
