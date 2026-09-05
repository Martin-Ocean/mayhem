import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { Secrets } from "./types";

export interface SecretsCodec {
  encrypt(plainText: string): Buffer;
  decrypt(cipherText: Buffer): string;
}

/**
 * Real codec for the packaged app: Electron's safeStorage (Windows DPAPI-backed). Requires
 * the Electron runtime to be up (app 'ready'), so this is only constructed from main/index.ts
 * -- never imported by anything unit-tested outside Electron.
 */
export function createElectronSafeStorageCodec(): SecretsCodec {
  // Imported lazily so this file can be type-checked/tested without the electron module
  // needing to be the real runtime.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { safeStorage } = require("electron") as typeof import("electron");
  return {
    encrypt: (plainText: string) => safeStorage.encryptString(plainText),
    decrypt: (cipherText: Buffer) => safeStorage.decryptString(cipherText),
  };
}

/**
 * Secrets persistence -- always encrypted at rest via the injected codec, stored separately
 * from non-secret settings (config/store.ts) so it's never accidentally logged or synced
 * alongside plain config. Each field is encrypted independently.
 */
export class SecretsStore {
  constructor(private readonly filePath: string, private readonly codec: SecretsCodec) {}

  async load(): Promise<Secrets> {
    try {
      const raw = await readFile(this.filePath, "utf-8");
      const encoded = JSON.parse(raw) as Record<string, string>;
      const secrets: Secrets = {};
      for (const [key, base64] of Object.entries(encoded)) {
        secrets[key as keyof Secrets] = this.codec.decrypt(Buffer.from(base64, "base64"));
      }
      return secrets;
    } catch {
      return {};
    }
  }

  async save(secrets: Secrets): Promise<void> {
    const encoded: Record<string, string> = {};
    for (const [key, value] of Object.entries(secrets)) {
      if (value === undefined) continue;
      encoded[key] = this.codec.encrypt(value).toString("base64");
    }

    await mkdir(dirname(this.filePath), { recursive: true });
    const tempPath = `${this.filePath}.tmp`;
    await writeFile(tempPath, JSON.stringify(encoded, null, 2), "utf-8");
    await rename(tempPath, this.filePath);
  }
}
