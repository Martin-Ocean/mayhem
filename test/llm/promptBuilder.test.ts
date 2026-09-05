import { describe, expect, it } from "vitest";
import { buildPrompt } from "../../src/main/llm/promptBuilder";
import type { CommentaryInput } from "../../src/main/llm/types";
import { buildTwoTeamSummary } from "../highlights/helpers";

describe("buildPrompt", () => {
  it("includes the persona description and house rules in the system prompt", () => {
    const summary = buildTwoTeamSummary([{}], []);
    const input: CommentaryInput = { summary, highlights: [], friendNames: {}, persona: "roast" };

    const { system } = buildPrompt(input);
    expect(system).toContain("Affectionate roast");
    expect(system).toContain("spokenText must be plain text only");
    expect(system).toContain("no markdown, no emoji");
  });

  it("pre-substitutes friend display names into the highlight payload rather than leaving puuids", () => {
    const summary = buildTwoTeamSummary([{}], []);
    const puuid = summary.participants[0].puuid;
    const input: CommentaryInput = {
      summary,
      highlights: [{ type: "carryMvp", weight: 80, participants: [puuid], data: { championName: "Jhin" } }],
      friendNames: { [puuid]: "Dave" },
      persona: "deadpan",
    };

    const { user } = buildPrompt(input);
    const payload = JSON.parse(user);
    expect(payload.highlights[0].names).toEqual(["Dave"]);
    expect(payload.highlights[0].championName).toBe("Jhin");
    expect(user).not.toContain(puuid);
  });

  it("carries mode name and remake/surrender flags into the user payload", () => {
    const summary = buildTwoTeamSummary([{}], [], {
      modeName: "ARAM Mayhem",
      isRemake: true,
      endedInEarlySurrender: true,
    });
    const input: CommentaryInput = { summary, highlights: [], friendNames: {}, persona: "deadpan" };

    const payload = JSON.parse(buildPrompt(input).user);
    expect(payload.modeName).toBe("ARAM Mayhem");
    expect(payload.isRemake).toBe(true);
    expect(payload.endedInEarlySurrender).toBe(true);
  });
});
