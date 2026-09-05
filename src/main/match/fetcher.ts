import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { LcuClient } from "../lcu/client";
import { LcuNotFoundError } from "../lcu/client";
import { EOG_WAIT_SECONDS } from "../lcu/phases";
import type { EogStatsBlock, RawLcuGame } from "./raw";

const RETRY_INTERVAL_MS = 3000;

interface RawEogStatsBlockResponse {
  teams?: Array<{ players?: Array<Record<string, unknown> & { puuid?: string }> }>;
  players?: Array<Record<string, unknown> & { puuid?: string }>;
  [key: string]: unknown;
}

/**
 * Flattens whatever nested shape /lol-end-of-game/v1/eog-stats-block returns into a
 * puuid-keyed map. Mirrors the reference app's extract_eog_stats() — best-effort, since the
 * exact shape isn't guaranteed across client versions.
 */
export function flattenEogStats(raw: RawEogStatsBlockResponse | undefined): EogStatsBlock {
  if (!raw) return {};

  const entries: Array<Record<string, unknown> & { puuid?: string }> = [];
  if (Array.isArray(raw.players)) entries.push(...raw.players);
  if (Array.isArray(raw.teams)) {
    for (const team of raw.teams) {
      if (Array.isArray(team.players)) entries.push(...team.players);
    }
  }

  const result: EogStatsBlock = {};
  for (const entry of entries) {
    if (!entry.puuid) continue;
    result[entry.puuid] = {
      totalHeal: entry.totalHeal as number | undefined,
      totalHealsOnTeammates: entry.totalHealsOnTeammates as number | undefined,
      totalDamageShieldedOnTeammates: entry.totalDamageShieldedOnTeammates as number | undefined,
      totalUnitsHealed: entry.totalUnitsHealed as number | undefined,
      wasAfk: entry.wasAfk as boolean | undefined,
      leaver: entry.leaver as boolean | undefined,
    };
  }
  return result;
}

export interface FetchedMatch {
  rawGame: RawLcuGame;
  eogStats: EogStatsBlock;
}

/**
 * Once GameStateMachine emits gameEnded(gameId), retrieves the raw match-history game JSON
 * (retrying up to EOG_WAIT_SECONDS, since it may not be ready immediately) plus the
 * supplemental eog-stats-block (best-effort, non-fatal if unavailable).
 */
export class MatchFetcher {
  constructor(
    private readonly lcu: LcuClient,
    private readonly options: { dumpDir?: string } = {}
  ) {}

  async fetchMatch(gameId: number): Promise<FetchedMatch> {
    const rawGame = await this.waitForMatchHistory(gameId);
    const eogStats = await this.tryFetchEogStats();

    if (this.options.dumpDir) {
      await this.dumpFixture(gameId, rawGame, eogStats);
    }

    return { rawGame, eogStats };
  }

  private async waitForMatchHistory(gameId: number): Promise<RawLcuGame> {
    const deadline = Date.now() + EOG_WAIT_SECONDS * 1000;

    for (;;) {
      try {
        return await this.lcu.request<RawLcuGame>(
          "GET",
          `/lol-match-history/v1/games/${gameId}`
        );
      } catch (err) {
        const isNotReadyYet = err instanceof LcuNotFoundError;
        if (!isNotReadyYet || Date.now() > deadline) throw err;
        await sleep(RETRY_INTERVAL_MS);
      }
    }
  }

  private async tryFetchEogStats(): Promise<EogStatsBlock> {
    try {
      const raw = await this.lcu.request<RawEogStatsBlockResponse>(
        "GET",
        "/lol-end-of-game/v1/eog-stats-block"
      );
      return flattenEogStats(raw);
    } catch {
      return {};
    }
  }

  private async dumpFixture(gameId: number, rawGame: RawLcuGame, eogStats: EogStatsBlock): Promise<void> {
    const dir = this.options.dumpDir!;
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, `${gameId}-game.json`), JSON.stringify(rawGame, null, 2));
    await writeFile(join(dir, `${gameId}-eog.json`), JSON.stringify(eogStats, null, 2));
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
