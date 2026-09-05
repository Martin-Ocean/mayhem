import { Client, GatewayIntentBits, type TextBasedChannel } from "discord.js";

/**
 * Thin wrapper around the discord.js Client this app owns for its entire lifetime. Local
 * sensors never talk to Discord directly (see voiceDelivery.ts) -- this is the one place a
 * connection to Discord exists.
 */
export class BotClient {
  readonly client: Client;
  private ready: Promise<void>;

  constructor() {
    this.client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
    });
    this.ready = new Promise((resolve) => {
      this.client.once("clientReady", () => resolve());
    });
  }

  async login(token: string): Promise<void> {
    await this.client.login(token);
    await this.ready;
  }

  async getTextChannel(channelId: string): Promise<TextBasedChannel> {
    const channel = await this.client.channels.fetch(channelId);
    if (!channel || !channel.isTextBased()) {
      throw new Error(`Channel ${channelId} is not a text channel`);
    }
    return channel;
  }

  async destroy(): Promise<void> {
    await this.client.destroy();
  }
}
