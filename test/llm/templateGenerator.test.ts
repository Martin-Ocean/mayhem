import { describe, expect, it } from "vitest";
import { TemplateCommentaryGenerator } from "../../src/main/llm/templateGenerator";
import type { CommentaryInput } from "../../src/main/llm/types";
import { buildTwoTeamSummary } from "../highlights/helpers";
import type { Highlight } from "../../src/main/highlights/types";

function fixedRandom(value = 0): () => number {
  return () => value;
}

describe("TemplateCommentaryGenerator", () => {
  it("substitutes friend names and highlight data into the picked template", async () => {
    const summary = buildTwoTeamSummary([{ pentaKills: 1, championName: "Sett" }], []);
    const alicePuuid = summary.participants[0].puuid;
    const highlight: Highlight = {
      type: "multikill",
      weight: 100,
      participants: [alicePuuid],
      data: { size: "penta", championName: "Sett" },
    };
    const input: CommentaryInput = {
      summary,
      highlights: [highlight],
      friendNames: { [alicePuuid]: "Alice" },
      persona: "deadpan",
    };

    const generator = new TemplateCommentaryGenerator(fixedRandom(0));
    const result = await generator.generate(input);

    expect(result.spokenText).toContain("Alice");
    expect(result.spokenText).toContain("penta");
    expect(result.spokenText).toContain("Sett");
    expect(result.embedBody).toContain("🔥");
  });

  it("falls back to the participant's riotId when no friend mapping exists", async () => {
    const summary = buildTwoTeamSummary([{ firstBloodKill: true, riotId: "Bob#NA1" }], []);
    const bobPuuid = summary.participants[0].puuid;
    const input: CommentaryInput = {
      summary,
      highlights: [{ type: "firstBlood", weight: 25, participants: [bobPuuid], data: { championName: "Thresh" } }],
      friendNames: {},
      persona: "roast",
    };

    const result = await new TemplateCommentaryGenerator(fixedRandom(0)).generate(input);
    expect(result.spokenText).toContain("Bob");
  });

  it("produces a short remake-only response when isRemake is set, ignoring other highlights", async () => {
    const summary = buildTwoTeamSummary([{}], [], { isRemake: true, gameDuration: 120 });
    const input: CommentaryInput = {
      summary,
      highlights: [{ type: "remakeContext", weight: 100, participants: [], data: {} }],
      friendNames: {},
      persona: "deadpan",
    };

    const result = await new TemplateCommentaryGenerator(fixedRandom(0)).generate(input);
    expect(result.title).toContain("Remake");
    expect(result.spokenText.length).toBeLessThan(120);
  });

  it("joins multiple highlights into embedBody lines and a single spokenText string", async () => {
    const summary = buildTwoTeamSummary([{}], []);
    const puuid = summary.participants[0].puuid;
    const highlights: Highlight[] = [
      { type: "carryMvp", weight: 80, participants: [puuid], data: { championName: "Jhin", kills: 10, deaths: 2, assists: 5 } },
      { type: "stomp", weight: 30, participants: [], data: { killDiff: 20 } },
    ];
    const input: CommentaryInput = { summary, highlights, friendNames: {}, persona: "hypeCaster" };

    const result = await new TemplateCommentaryGenerator(fixedRandom(0)).generate(input);
    expect(result.embedBody.split("\n")).toHaveLength(2);
    expect(result.spokenText.length).toBeGreaterThan(0);
  });
});
