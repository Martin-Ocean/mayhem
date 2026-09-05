export interface ParticipantSummary {
  puuid: string;
  riotId: string;
  championId: number;
  championName: string;
  teamId: number;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  kda: number;
  cs: number;
  goldEarned: number;
  items: number[];
  trinket: number;
  damageDealtToChampions: number;
  damageTaken: number;
  totalHeal: number;
  totalHealsOnTeammates: number;
  totalDamageShieldedOnTeammates: number;
  visionScore: number;
  doubleKills: number;
  tripleKills: number;
  quadraKills: number;
  pentaKills: number;
  largestMultiKill: number;
  firstBloodKill: boolean;
  firstBloodAssist: boolean;
  firstTowerKill: boolean;
  firstTowerAssist: boolean;
  wasAfk: boolean;
  leaver: boolean;
  summonerSpell1Id: number;
  summonerSpell2Id: number;
}

export interface TeamSummary {
  teamId: number;
  win: boolean;
  totalKills: number;
  totalGold: number;
  towerKills: number;
  dragonKills: number;
  baronKills: number;
  riftHeraldKills: number;
  inhibitorKills: number;
}

/** A participant known to be one of the tracked friend group, resolved via config's PUUID map. */
export interface TrackedParticipant {
  puuid: string;
  discordName: string;
  participant: ParticipantSummary;
}

export interface MatchSummary {
  gameId: number;
  platformId: string;
  queueId: number;
  gameMode: string;
  /** Human-readable mode name, e.g. "ARAM Mayhem" for queueId 2400. */
  modeName: string;
  gameDuration: number;
  gameCreation: number;
  gameVersion: string;
  isRemake: boolean;
  endedInSurrender: boolean;
  endedInEarlySurrender: boolean;
  participants: ParticipantSummary[];
  teams: TeamSummary[];
  trackedParticipants: TrackedParticipant[];
}

export type FriendMap = Record<string, string>; // puuid -> discord display name
export type ChampionMap = Record<number, string>; // championId -> champion name
