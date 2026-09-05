import type { Readable } from "node:stream";
import {
  AudioPlayerStatus,
  StreamType,
  VoiceConnectionStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  joinVoiceChannel,
} from "@discordjs/voice";
import type { Guild, VoiceBasedChannel } from "discord.js";

const VOICE_READY_TIMEOUT_MS = 10_000;
const PLAYBACK_START_TIMEOUT_MS = 5_000;

export interface VoiceStateLike {
  channelId: string | null;
  member: { displayName: string; user: { username: string } } | null;
}

/**
 * Prefers an explicitly configured voice channel; otherwise auto-detects by finding a voice
 * channel that currently contains one of the tracked friends (matched by display name or
 * username, case-insensitively -- a heuristic, since friend mapping is by display name, not
 * a stored Discord user id).
 */
export function selectVoiceChannelId(
  voiceStates: Iterable<VoiceStateLike>,
  configuredChannelId: string | undefined,
  trackedDisplayNames: string[]
): string | undefined {
  if (configuredChannelId) return configuredChannelId;

  const lowerNames = new Set(trackedDisplayNames.map((n) => n.toLowerCase()));
  for (const state of voiceStates) {
    if (!state.channelId || !state.member) continue;
    const displayName = state.member.displayName.toLowerCase();
    const username = state.member.user.username.toLowerCase();
    if (lowerNames.has(displayName) || lowerNames.has(username)) {
      return state.channelId;
    }
  }
  return undefined;
}

/**
 * Joins the given voice channel, plays the provided audio stream to completion, then always
 * leaves -- never lingers connected. `audioStream` may be any ffmpeg-decodable format (mp3,
 * ogg, ...); @discordjs/voice transcodes it via prism-media/ffmpeg-static.
 */
export async function playInVoiceChannel(
  guild: Guild,
  channel: VoiceBasedChannel,
  audioStream: Readable
): Promise<void> {
  const connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: guild.id,
    adapterCreator: guild.voiceAdapterCreator,
  });

  try {
    await entersState(connection, VoiceConnectionStatus.Ready, VOICE_READY_TIMEOUT_MS);

    const player = createAudioPlayer();
    const resource = createAudioResource(audioStream, { inputType: StreamType.Arbitrary });
    connection.subscribe(player);
    player.play(resource);

    await entersState(player, AudioPlayerStatus.Playing, PLAYBACK_START_TIMEOUT_MS);
    await new Promise<void>((resolve, reject) => {
      player.once(AudioPlayerStatus.Idle, () => resolve());
      player.once("error", reject);
    });
  } finally {
    connection.destroy();
  }
}
