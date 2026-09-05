import type { ChampionMap, FriendMap, MatchSummary, ParticipantSummary, TeamSummary, TrackedParticipant } from "./types";
import { EogStatsBlock, RawLcuGame, RawParticipant, RawParticipantIdentity, readField } from "./raw";

const QUEUE_MODE_NAMES: Record<number, string> = {
  2400: "ARAM Mayhem",
  450: "ARAM",
  400: "Normal Draft",
  420: "Ranked Solo/Duo",
  430: "Normal Blind",
  440: "Ranked Flex",
  700: "Clash",
  900: "URF",
  1900: "URF",
};

const REMAKE_MAX_DURATION_SECONDS = 300;

function resolveModeName(queueId: number | undefined, gameMode: string | undefined): string {
  if (queueId !== undefined && QUEUE_MODE_NAMES[queueId]) return QUEUE_MODE_NAMES[queueId];
  return gameMode ?? "Unknown";
}

function findIdentity(
  identities: RawParticipantIdentity[],
  participantId: number
): RawParticipantIdentity | undefined {
  return identities.find((identity) => identity.participantId === participantId);
}

function buildRiotId(identity: RawParticipantIdentity | undefined): string {
  const player = identity?.player;
  if (!player) return "Unknown";
  if (player.gameName && player.tagLine) return `${player.gameName}#${player.tagLine}`;
  return player.summonerName ?? "Unknown";
}

function buildParticipant(
  raw: RawParticipant,
  identity: RawParticipantIdentity | undefined,
  eog: EogStatsBlock,
  championMap: ChampionMap
): ParticipantSummary {
  const stats = raw.stats ?? {};
  const puuid = identity?.player?.puuid ?? "";
  const eogStats = eog[puuid] ?? {};

  const kills = stats.kills ?? 0;
  const deaths = stats.deaths ?? 0;
  const assists = stats.assists ?? 0;

  return {
    puuid,
    riotId: buildRiotId(identity),
    championId: raw.championId,
    championName: championMap[raw.championId] ?? `Champion${raw.championId}`,
    teamId: raw.teamId,
    win: Boolean(stats.win),
    kills,
    deaths,
    assists,
    kda: (kills + assists) / Math.max(deaths, 1),
    cs: (stats.totalMinionsKilled ?? 0) + (stats.neutralMinionsKilled ?? 0),
    goldEarned: stats.goldEarned ?? 0,
    items: [stats.item0, stats.item1, stats.item2, stats.item3, stats.item4, stats.item5]
      .map((item) => item ?? 0),
    trinket: stats.item6 ?? 0,
    damageDealtToChampions: stats.totalDamageDealtToChampions ?? 0,
    damageTaken: stats.totalDamageTaken ?? 0,
    totalHeal: readField<number>(eogStats as Record<string, unknown>, "totalHeal") ?? stats.totalHeal ?? 0,
    totalHealsOnTeammates: readField<number>(eogStats as Record<string, unknown>, "totalHealsOnTeammates") ?? 0,
    totalDamageShieldedOnTeammates:
      readField<number>(eogStats as Record<string, unknown>, "totalDamageShieldedOnTeammates") ?? 0,
    visionScore: stats.visionScore ?? 0,
    doubleKills: stats.doubleKills ?? 0,
    tripleKills: stats.tripleKills ?? 0,
    quadraKills: stats.quadraKills ?? 0,
    pentaKills: stats.pentaKills ?? 0,
    largestMultiKill: stats.largestMultiKill ?? 0,
    firstBloodKill: Boolean(stats.firstBloodKill),
    firstBloodAssist: Boolean(stats.firstBloodAssist),
    firstTowerKill: Boolean(stats.firstTowerKill),
    firstTowerAssist: Boolean(stats.firstTowerAssist),
    wasAfk: Boolean(readField<boolean>(eogStats as Record<string, unknown>, "wasAfk")),
    leaver: Boolean(readField<boolean>(eogStats as Record<string, unknown>, "leaver")),
    summonerSpell1Id: raw.spell1Id ?? 0,
    summonerSpell2Id: raw.spell2Id ?? 0,
  };
}

function buildTeam(raw: RawLcuGame["teams"][number], participants: ParticipantSummary[]): TeamSummary {
  const teamParticipants = participants.filter((p) => p.teamId === raw.teamId);
  return {
    teamId: raw.teamId,
    win: raw.win === true || raw.win === "Win",
    totalKills: teamParticipants.reduce((sum, p) => sum + p.kills, 0),
    totalGold: teamParticipants.reduce((sum, p) => sum + p.goldEarned, 0),
    towerKills: raw.towerKills ?? 0,
    dragonKills: raw.dragonKills ?? 0,
    baronKills: raw.baronKills ?? 0,
    riftHeraldKills: raw.riftHeraldKills ?? 0,
    inhibitorKills: raw.inhibitorKills ?? 0,
  };
}

/**
 * Pure builder: raw LCU match-history JSON + flattened eog-stats-block -> typed MatchSummary.
 * No I/O — fully unit-testable against fixture JSON.
 */
export function buildMatchSummary(
  rawGame: RawLcuGame,
  eogStats: EogStatsBlock,
  championMap: ChampionMap,
  friendMap: FriendMap
): MatchSummary {
  const participants = rawGame.participants.map((raw) =>
    buildParticipant(raw, findIdentity(rawGame.participantIdentities, raw.participantId), eogStats, championMap)
  );

  const teams = rawGame.teams.map((raw) => buildTeam(raw, participants));

  const endedInSurrender = participants.some(
    (_, i) => rawGame.participants[i].stats?.gameEndedInSurrender === true
  );
  const endedInEarlySurrender = participants.some(
    (_, i) => rawGame.participants[i].stats?.gameEndedInEarlySurrender === true
  );
  const gameDuration = rawGame.gameDuration ?? 0;
  const isRemake = endedInEarlySurrender || gameDuration <= REMAKE_MAX_DURATION_SECONDS;

  const trackedParticipants: TrackedParticipant[] = participants
    .filter((p) => friendMap[p.puuid])
    .map((p) => ({ puuid: p.puuid, discordName: friendMap[p.puuid], participant: p }));

  return {
    gameId: rawGame.gameId,
    platformId: rawGame.platformId ?? "",
    queueId: rawGame.queueId ?? 0,
    gameMode: rawGame.gameMode ?? "UNKNOWN",
    modeName: resolveModeName(rawGame.queueId, rawGame.gameMode),
    gameDuration,
    gameCreation: rawGame.gameCreation ?? 0,
    gameVersion: rawGame.gameVersion ?? "",
    isRemake,
    endedInSurrender,
    endedInEarlySurrender,
    participants,
    teams,
    trackedParticipants,
  };
}
