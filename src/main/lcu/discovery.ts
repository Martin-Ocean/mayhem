import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";

const execFileAsync = promisify(execFile);

export interface LcuCredentials {
  address: string;
  port: number;
  password: string;
  protocol: "https" | "http";
}

/**
 * Dev/test override: point the whole app at scripts/mock-lcu-server.ts instead of a real
 * League client, mirroring the reference app's COMPANION_LCU_BASE/COMPANION_LCU_TOKEN.
 * LCU_BASE_OVERRIDE example: "http://127.0.0.1:9999"
 */
export function credentialsFromEnvOverride(): LcuCredentials | null {
  const base = process.env.LCU_BASE_OVERRIDE;
  const token = process.env.LCU_TOKEN_OVERRIDE;
  if (!base || !token) return null;

  const url = new URL(base);
  return {
    address: url.hostname,
    port: Number(url.port || (url.protocol === "https:" ? 443 : 80)),
    password: token,
    protocol: url.protocol === "https:" ? "https" : "http",
  };
}

// name:pid:port:password:protocol
const LOCKFILE_PATTERN = /^[^:]+:(\d+):(\d+):([^:]+):(https?)$/;


/**
 * Fallback discovery used only if `league-connect`'s own authenticate() fails.
 * Mirrors the reference app's approach: parse --app-port/--remoting-auth-token off the
 * running LeagueClientUx.exe command line via PowerShell (Windows only).
 */
export async function discoverFromProcessCommandLine(): Promise<LcuCredentials | null> {
  if (process.platform !== "win32") return null;

  try {
    const { stdout } = await execFileAsync("powershell.exe", [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      "Get-CimInstance Win32_Process -Filter \"Name = 'LeagueClientUx.exe'\" | Select-Object -ExpandProperty CommandLine",
    ]);

    const commandLine = stdout.trim();
    if (!commandLine) return null;

    const portMatch = commandLine.match(/--app-port=(\d+)/);
    const tokenMatch = commandLine.match(/--remoting-auth-token=([^\s"]+)/);
    if (!portMatch || !tokenMatch) return null;

    return {
      address: "127.0.0.1",
      port: Number(portMatch[1]),
      password: tokenMatch[1],
      protocol: "https",
    };
  } catch {
    return null;
  }
}

/**
 * Secondary fallback: parse a League "lockfile" directly, in the format
 * `processName:pid:port:password:protocol`.
 */
export async function discoverFromLockfile(lockfilePath: string): Promise<LcuCredentials | null> {
  try {
    const contents = await readFile(lockfilePath, "utf-8");
    const match = contents.trim().match(LOCKFILE_PATTERN);
    if (!match) return null;

    const [, , port, password, protocol] = match;
    return {
      address: "127.0.0.1",
      port: Number(port),
      password,
      protocol: protocol === "https" ? "https" : "http",
    };
  } catch {
    return null;
  }
}
