import type { MatchSummary, ParticipantSummary, TeamSummary } from "../../src/main/match/types";

let counter = 0;

export function makeParticipant(overrides: Partial<ParticipantSummary> = {}): ParticipantSummary {
  counter += 1;
  return {
    puuid: `puuid-${counter}`,
    riotId: `Player${counter}#NA1`,
    championId: counter,
    championName: `Champion${counter}`,
    teamId: 100,
    win: true,
    kills: 0,
    deaths: 0,
    assists: 0,
    kda: 0,
    cs: 0,
    goldEarned: 0,
    items: [0, 0, 0, 0, 0, 0],
    trinket: 0,
    damageDealtToChampions: 0,
    damageTaken: 0,
    totalHeal: 0,
    totalHealsOnTeammates: 0,
    totalDamageShieldedOnTeammates: 0,
    visionScore: 0,
    doubleKills: 0,
    tripleKills: 0,
    quadraKills: 0,
    pentaKills: 0,
    largestMultiKill: 0,
    firstBloodKill: false,
    firstBloodAssist: false,
    firstTowerKill: false,
    firstTowerAssist: false,
    wasAfk: false,
    leaver: false,
    summonerSpell1Id: 4,
    summonerSpell2Id: 7,
    ...overrides,
  };
}

export function makeTeam(overrides: Partial<TeamSummary> = {}): TeamSummary {
  return {
    teamId: 100,
    win: true,
    totalKills: 0,
    totalGold: 0,
    towerKills: 0,
    dragonKills: 0,
    baronKills: 0,
    riftHeraldKills: 0,
    inhibitorKills: 0,
    ...overrides,
  };
}

export function makeSummary(overrides: Partial<MatchSummary> = {}): MatchSummary {
  return {
    gameId: 1,
    platformId: "NA1",
    queueId: 2400,
    gameMode: "ARAM",
    modeName: "ARAM Mayhem",
    gameDuration: 1200,
    gameCreation: 0,
    gameVersion: "14.20.1",
    isRemake: false,
    endedInSurrender: false,
    endedInEarlySurrender: false,
    participants: [],
    teams: [],
    trackedParticipants: [],
    ...overrides,
  };
}

/** Builds a simple 2v2 summary from raw per-player (kills, deaths, assists, extra) tuples, teamId 100 vs 200. */
export function buildTwoTeamSummary(
  team100: Array<Partial<ParticipantSummary>>,
  team200: Array<Partial<ParticipantSummary>>,
  summaryOverrides: Partial<MatchSummary> = {}
): MatchSummary {
  const p100 = team100.map((p) => makeParticipant({ teamId: 100, win: true, ...p }));
  const p200 = team200.map((p) => makeParticipant({ teamId: 200, win: false, ...p }));
  const participants = [...p100, ...p200];

  const teams: TeamSummary[] = [
    makeTeam({
      teamId: 100,
      win: true,
      totalKills: p100.reduce((s, p) => s + (p.kills ?? 0), 0),
      totalGold: p100.reduce((s, p) => s + (p.goldEarned ?? 0), 0),
    }),
    makeTeam({
      teamId: 200,
      win: false,
      totalKills: p200.reduce((s, p) => s + (p.kills ?? 0), 0),
      totalGold: p200.reduce((s, p) => s + (p.goldEarned ?? 0), 0),
    }),
  ];

  return makeSummary({ participants, teams, ...summaryOverrides });
}
