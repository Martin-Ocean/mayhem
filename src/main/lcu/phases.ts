export const IN_GAME_PHASES = new Set(["InProgress", "Reconnect"]);

export const EOG_PHASES = new Set(["WaitingForStats", "PreEndOfGame", "EndOfGame"]);

export const EOG_WAIT_SECONDS = 150;
export const POST_GAME_WINDOW_SECONDS = 15 * 60;
export const POLL_FALLBACK_INTERVAL_MS = 3000;
export const RECONNECT_RETRY_MS = 10_000;

export type GameflowPhase =
  | "None"
  | "Lobby"
  | "Matchmaking"
  | "CheckedIntoTournament"
  | "ReadyCheck"
  | "ChampSelect"
  | "GameStart"
  | "FailedToLaunch"
  | "InProgress"
  | "Reconnect"
  | "WaitingForStats"
  | "PreEndOfGame"
  | "EndOfGame"
  | "TerminatedInError"
  | string;
