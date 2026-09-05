import type { IpcMain, WebContents } from "electron";
import type { ConfigStore } from "../config/store";
import type { SecretsStore } from "../config/secrets";
import type { BotClient } from "../discord/botClient";
import type { LcuClient } from "../lcu/client";
import type { StatusBus } from "../statusBus";
import type { AppConfig } from "../config/types";
import {
  IPC,
  type ChannelOption,
  type DiscordConnectionResult,
  type SecretsInput,
  type SecretsPresence,
  type StatusSnapshot,
  type TestAnnouncementResult,
} from "./contract";
import { ChannelType } from "discord.js";

export interface IpcHandlerDeps {
  ipcMain: IpcMain;
  getWebContents: () => WebContents | undefined;
  configStore: ConfigStore;
  secretsStore: SecretsStore;
  botClient: BotClient;
  lcu: LcuClient;
  statusBus: StatusBus;
  runTestAnnouncement: () => Promise<TestAnnouncementResult>;
}

/** Tracks live status and pushes updates to the renderer; also answers getStatus. */
export class StatusTracker {
  private snapshot: StatusSnapshot = {
    lcuConnected: false,
    lastPhase: null,
    lastAnnouncedGameId: null,
    lastError: null,
  };

  constructor(private readonly deps: Pick<IpcHandlerDeps, "lcu" | "statusBus" | "getWebContents">) {
    deps.lcu.on("connected", () => this.update({ lcuConnected: true }));
    deps.lcu.on("disconnected", () => this.update({ lcuConnected: false }));
    deps.lcu.on("phase", (phase) => this.update({ lastPhase: phase }));
    deps.lcu.on("error", (err) => this.update({ lastError: String(err) }));
    deps.statusBus.on("announced", ({ gameId }) => this.update({ lastAnnouncedGameId: gameId }));
    deps.statusBus.on("error", (err) => this.update({ lastError: String(err) }));
  }

  get(): StatusSnapshot {
    return { ...this.snapshot };
  }

  private update(partial: Partial<StatusSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...partial };
    this.deps.getWebContents()?.send(IPC.statusUpdate, this.snapshot);
  }
}

export function registerIpcHandlers(deps: IpcHandlerDeps): StatusTracker {
  const { ipcMain, configStore, secretsStore, botClient } = deps;
  const statusTracker = new StatusTracker(deps);

  ipcMain.handle(IPC.getConfig, async () => configStore.load());

  ipcMain.handle(IPC.setConfig, async (_event, config: AppConfig) => {
    await configStore.save(config);
  });

  ipcMain.handle(IPC.getSecretsPresence, async (): Promise<SecretsPresence> => {
    const secrets = await secretsStore.load();
    return {
      discordBotToken: Boolean(secrets.discordBotToken),
      anthropicApiKey: Boolean(secrets.anthropicApiKey),
      ttsApiKey: Boolean(secrets.ttsApiKey),
    };
  });

  ipcMain.handle(IPC.setSecrets, async (_event, input: SecretsInput) => {
    const existing = await secretsStore.load();
    await secretsStore.save({ ...existing, ...input });
  });

  ipcMain.handle(IPC.testDiscordConnection, async (): Promise<DiscordConnectionResult> => {
    try {
      const secrets = await secretsStore.load();
      if (!secrets.discordBotToken) {
        return { ok: false, error: "No Discord bot token saved yet." };
      }
      await botClient.login(secrets.discordBotToken);
      const guilds = [...botClient.client.guilds.cache.values()].map((g) => ({ id: g.id, name: g.name }));
      return { ok: true, guilds };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  });

  ipcMain.handle(
    IPC.listChannels,
    async (_event, guildId: string): Promise<{ text: ChannelOption[]; voice: ChannelOption[] }> => {
      const guild = await botClient.client.guilds.fetch(guildId);
      const channels = await guild.channels.fetch();
      const text: ChannelOption[] = [];
      const voice: ChannelOption[] = [];
      for (const channel of channels.values()) {
        if (!channel) continue;
        if (channel.type === ChannelType.GuildText) text.push({ id: channel.id, name: channel.name });
        if (channel.type === ChannelType.GuildVoice) voice.push({ id: channel.id, name: channel.name });
      }
      return { text, voice };
    }
  );

  ipcMain.handle(IPC.runTestAnnouncement, async () => deps.runTestAnnouncement());

  ipcMain.handle(IPC.getStatus, async () => statusTracker.get());

  return statusTracker;
}
