/**
 * Loose types for the raw LCU `/lol-match-history/v1/games/{gameId}` response.
 *
 * LCU mirrors Riot's internal match data model closely, but field presence/casing is not
 * strongly guaranteed across game versions/modes (the reference app already has to defend
 * against this for the eog-stats-block). Keep these permissive and read defensively in
 * normalize.ts rather than trusting exact shapes.
 */
export interface RawParticipantIdentity {
  participantId: number;
  player?: {
    puuid?: string;
    gameName?: string;
    tagLine?: string;
    summonerName?: string;
  };
}

export interface RawParticipantStats {
  win?: boolean;
  kills?: number;
  deaths?: number;
  assists?: number;
  item0?: number;
  item1?: number;
  item2?: number;
  item3?: number;
  item4?: number;
  item5?: number;
  item6?: number;
  goldEarned?: number;
  totalMinionsKilled?: number;
  neutralMinionsKilled?: number;
  totalDamageDealtToChampions?: number;
  totalDamageTaken?: number;
  totalHeal?: number;
  visionScore?: number;
  doubleKills?: number;
  tripleKills?: number;
  quadraKills?: number;
  pentaKills?: number;
  largestMultiKill?: number;
  firstBloodKill?: boolean;
  firstBloodAssist?: boolean;
  firstTowerKill?: boolean;
  firstTowerAssist?: boolean;
  gameEndedInSurrender?: boolean;
  gameEndedInEarlySurrender?: boolean;
  [key: string]: unknown;
}

export interface RawParticipant {
  participantId: number;
  championId: number;
  teamId: number;
  spell1Id?: number;
  spell2Id?: number;
  stats?: RawParticipantStats;
  [key: string]: unknown;
}

export interface RawTeam {
  teamId: number;
  win?: string | boolean;
  towerKills?: number;
  dragonKills?: number;
  baronKills?: number;
  riftHeraldKills?: number;
  inhibitorKills?: number;
  [key: string]: unknown;
}

export interface RawLcuGame {
  gameId: number;
  platformId?: string;
  queueId?: number;
  gameMode?: string;
  gameDuration?: number;
  gameCreation?: number;
  gameVersion?: string;
  participants: RawParticipant[];
  participantIdentities: RawParticipantIdentity[];
  teams: RawTeam[];
  [key: string]: unknown;
}

export interface EogParticipantStats {
  totalHeal?: number;
  totalHealsOnTeammates?: number;
  totalDamageShieldedOnTeammates?: number;
  totalUnitsHealed?: number;
  wasAfk?: boolean;
  leaver?: boolean;
}

/** Flattened by fetcher.ts from whatever nested shape /lol-end-of-game/v1/eog-stats-block returns, keyed by puuid. */
export type EogStatsBlock = Record<string, EogParticipantStats>;

/** Defensive dual-casing field lookup — LCU field casing is inconsistent (confirmed by the reference app). */
export function readField<T>(obj: Record<string, unknown> | undefined, ...names: string[]): T | undefined {
  if (!obj) return undefined;
  for (const name of names) {
    if (obj[name] !== undefined) return obj[name] as T;
    const upper = name.toUpperCase();
    if (obj[upper] !== undefined) return obj[upper] as T;
  }
  return undefined;
}
