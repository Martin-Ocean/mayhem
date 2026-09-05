import type { AppConfig } from "../config/types";

/** What the renderer is allowed to know about secrets -- never the actual values. */
export interface SecretsPresence {
  discordBotToken: boolean;
  anthropicApiKey: boolean;
  ttsApiKey: boolean;
}

export interface SecretsInput {
  discordBotToken?: string;
  anthropicApiKey?: string;
  ttsApiKey?: string;
}

export interface DiscordConnectionResult {
  ok: boolean;
  error?: string;
  guilds?: Array<{ id: string; name: string }>;
}

export interface ChannelOption {
  id: string;
  name: string;
}

export interface TestAnnouncementResult {
  ok: boolean;
  error?: string;
  title?: string;
  embedBody?: string;
  spokenText?: string;
}

export interface StatusSnapshot {
  lcuConnected: boolean;
  lastPhase: string | null;
  lastAnnouncedGameId: number | null;
  lastError: string | null;
}

/** IPC channel names, kept in one place so preload and main never drift. */
export const IPC = {
  getConfig: "hexAram:getConfig",
  setConfig: "hexAram:setConfig",
  getSecretsPresence: "hexAram:getSecretsPresence",
  setSecrets: "hexAram:setSecrets",
  testDiscordConnection: "hexAram:testDiscordConnection",
  listChannels: "hexAram:listChannels",
  runTestAnnouncement: "hexAram:runTestAnnouncement",
  statusUpdate: "hexAram:statusUpdate",
  getStatus: "hexAram:getStatus",
} as const;

export interface HexAramApi {
  getConfig(): Promise<AppConfig>;
  setConfig(config: AppConfig): Promise<void>;
  getSecretsPresence(): Promise<SecretsPresence>;
  setSecrets(secrets: SecretsInput): Promise<void>;
  testDiscordConnection(): Promise<DiscordConnectionResult>;
  listChannels(guildId: string): Promise<{ text: ChannelOption[]; voice: ChannelOption[] }>;
  runTestAnnouncement(): Promise<TestAnnouncementResult>;
  getStatus(): Promise<StatusSnapshot>;
  onStatusUpdate(callback: (status: StatusSnapshot) => void): () => void;
}
