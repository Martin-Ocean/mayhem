import { EmbedBuilder, type TextBasedChannel } from "discord.js";
import type { MatchSummary } from "../match/types";
import type { CommentaryResult } from "../llm/types";

const WIN_COLOR = 0x2ecc71;
const LOSS_COLOR = 0xe74c3c;

const DATA_DRAGON_ICON_BASE = "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion";

function championIconUrl(championName: string): string {
  return `${DATA_DRAGON_ICON_BASE}/${championName}.png`;
}

/** Pure builder -- no I/O, easy to unit test. */
export function buildAnnouncementEmbed(summary: MatchSummary, commentary: CommentaryResult): EmbedBuilder {
  // "won" reflects the tracked friend group's result, not "did any team win" (which is
  // trivially always true -- exactly one team wins every real match).
  const primaryParticipant = summary.trackedParticipants[0]?.participant ?? summary.participants[0];
  const won = primaryParticipant?.win ?? false;
  const topChampion = primaryParticipant?.championName;
  const minutes = Math.floor(summary.gameDuration / 60);
  const seconds = summary.gameDuration % 60;

  const embed = new EmbedBuilder()
    .setTitle(commentary.title)
    .setDescription(commentary.embedBody)
    .setColor(won ? WIN_COLOR : LOSS_COLOR)
    .setFooter({ text: `${summary.modeName} • ${minutes}m ${seconds}s` });

  if (topChampion) {
    embed.setThumbnail(championIconUrl(topChampion));
  }

  return embed;
}

export async function sendTextAnnouncement(
  channel: TextBasedChannel,
  summary: MatchSummary,
  commentary: CommentaryResult
): Promise<void> {
  if (!channel.isSendable()) {
    throw new Error("Configured text channel is not sendable");
  }
  await channel.send({ embeds: [buildAnnouncementEmbed(summary, commentary)] });
}
