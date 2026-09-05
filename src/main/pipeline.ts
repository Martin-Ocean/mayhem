import type { LcuClient } from "./lcu/client";
import type { GameStateMachine } from "./lcu/gameStateMachine";
import { MatchFetcher } from "./match/fetcher";
import { buildMatchSummary } from "./match/normalize";
import { runHighlightEngine } from "./highlights/engine";
import { createCommentaryGenerator } from "./llm/commentaryGenerator";
import { ConfigStore } from "./config/store";
import { SecretsStore } from "./config/secrets";
import type { AppConfig, Secrets } from "./config/types";
import { BotClient } from "./discord/botClient";
import { sendTextAnnouncement } from "./discord/textDelivery";
import { playInVoiceChannel, selectVoiceChannelId } from "./discord/voiceDelivery";
import { GuildAnnouncementLock } from "./discord/announcementLock";
import { createTtsProvider } from "./discord/ttsProvider";
import type { ChampionMap, MatchSummary } from "./match/types";
import type { CommentaryResult } from "./llm/types";
import type { StatusBus } from "./statusBus";

export interface PipelineDeps {
  lcu: LcuClient;
  stateMachine: GameStateMachine;
  configStore: ConfigStore;
  secretsStore: SecretsStore;
  botClient: BotClient;
  championMap: ChampionMap;
  statusBus: StatusBus;
}

/**
 * Wires LCU detection through to Discord delivery. Everything downstream of "game ended" is
 * config-driven so behavior (persona, commentary source, feature toggles) can change without
 * a restart -- config/secrets are re-read fresh on every announcement.
 */
export class Pipeline {
  private readonly lock = new GuildAnnouncementLock();
  private readonly fetcher: MatchFetcher;

  constructor(private readonly deps: PipelineDeps) {
    this.fetcher = new MatchFetcher(deps.lcu);
    deps.stateMachine.on("gameEnded", (gameId) => {
      this.handleGameEnded(gameId).catch((err) => deps.statusBus.emit("error", err));
    });
  }

  private async handleGameEnded(gameId: number): Promise<void> {
    const { configStore, secretsStore, statusBus } = this.deps;
    const [config, secrets] = await Promise.all([configStore.load(), secretsStore.load()]);

    const { rawGame, eogStats } = await this.fetcher.fetchMatch(gameId);
    const summary = buildMatchSummary(rawGame, eogStats, this.deps.championMap, config.friendMap);
    const highlights = runHighlightEngine(summary);

    const generator = createCommentaryGenerator(
      config.commentarySource === "ai" && secrets.anthropicApiKey
        ? { source: "ai", ai: { apiKey: secrets.anthropicApiKey } }
        : { source: "template" }
    );
    const commentary = await generator.generate({
      summary,
      highlights,
      friendNames: config.friendMap,
      persona: config.persona,
    });

    if (config.guildId) {
      await this.lock.run(config.guildId, () => this.deliver(commentary, summary, config, secrets));
    }

    config.sentGameIds = this.deps.stateMachine.getSentGameIds();
    await configStore.save(config);
    statusBus.emit("announced", { gameId, commentary });
  }

  private async deliver(
    commentary: CommentaryResult,
    summary: MatchSummary,
    config: AppConfig,
    secrets: Secrets
  ): Promise<void> {
    const { botClient } = this.deps;

    if (config.features.textEnabled && config.textChannelId) {
      const channel = await botClient.getTextChannel(config.textChannelId);
      await sendTextAnnouncement(channel, summary, commentary);
    }

    if (config.features.voiceEnabled && config.ttsProvider && secrets.ttsApiKey && config.guildId) {
      const guild = await botClient.client.guilds.fetch(config.guildId);
      await guild.members.fetch();
      const trackedNames = Object.values(config.friendMap);
      const channelId = selectVoiceChannelId(
        guild.voiceStates.cache.values(),
        config.voiceChannelId,
        trackedNames
      );

      if (channelId) {
        const channel = await guild.channels.fetch(channelId);
        if (channel?.isVoiceBased()) {
          const ttsProvider = createTtsProvider({ provider: config.ttsProvider, apiKey: secrets.ttsApiKey });
          const audio = await ttsProvider.synthesize(commentary.spokenText);
          await playInVoiceChannel(guild, channel, audio);
        }
      }
    }
  }
}
