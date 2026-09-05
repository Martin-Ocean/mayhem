import { describe, expect, it } from "vitest";
import { buildAnnouncementEmbed } from "../../src/main/discord/textDelivery";
import { buildTwoTeamSummary } from "../highlights/helpers";
import type { CommentaryResult } from "../../src/main/llm/types";

const commentary: CommentaryResult = {
  title: "🔥 Multikill Alert",
  embedBody: "Alice went off on Sett.",
  spokenText: "Alice went off on Sett.",
};

describe("buildAnnouncementEmbed", () => {
  it("colors the embed green for a win and includes the title/body/footer", () => {
    const summary = buildTwoTeamSummary([{ championName: "Sett" }], [], { gameDuration: 725 });
    const embed = buildAnnouncementEmbed(summary, commentary).toJSON();

    expect(embed.title).toBe(commentary.title);
    expect(embed.description).toBe(commentary.embedBody);
    expect(embed.color).toBe(0x2ecc71);
    expect(embed.footer?.text).toContain("12m 5s");
  });

  it("colors the embed red for a loss", () => {
    const summary = buildTwoTeamSummary([], [{ championName: "Ashe" }]);
    const embed = buildAnnouncementEmbed(summary, commentary).toJSON();
    expect(embed.color).toBe(0xe74c3c);
  });

  it("sets a champion-icon thumbnail from the first tracked (or first) participant", () => {
    const summary = buildTwoTeamSummary([{ championName: "Jhin" }], []);
    const embed = buildAnnouncementEmbed(summary, commentary).toJSON();
    expect(embed.thumbnail?.url).toContain("Jhin.png");
  });
});
