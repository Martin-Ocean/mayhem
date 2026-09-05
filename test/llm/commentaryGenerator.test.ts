import { describe, expect, it } from "vitest";
import { createCommentaryGenerator, FallbackCommentaryGenerator } from "../../src/main/llm/commentaryGenerator";
import { TemplateCommentaryGenerator } from "../../src/main/llm/templateGenerator";
import type { CommentaryGenerator, CommentaryInput, CommentaryResult } from "../../src/main/llm/types";
import { buildTwoTeamSummary } from "../highlights/helpers";

const input: CommentaryInput = {
  summary: buildTwoTeamSummary([{ firstBloodKill: true }], []),
  highlights: [{ type: "firstBlood", weight: 25, participants: [], data: {} }],
  friendNames: {},
  persona: "deadpan",
};

class ThrowingGenerator implements CommentaryGenerator {
  async generate(): Promise<CommentaryResult> {
    throw new Error("boom");
  }
}

describe("createCommentaryGenerator", () => {
  it("returns a TemplateCommentaryGenerator for source 'template'", () => {
    const generator = createCommentaryGenerator({ source: "template" });
    expect(generator).toBeInstanceOf(TemplateCommentaryGenerator);
  });

  it("throws if source is 'ai' but no AI options are provided", () => {
    expect(() => createCommentaryGenerator({ source: "ai" })).toThrow();
  });
});

describe("FallbackCommentaryGenerator", () => {
  it("returns the primary generator's result when it succeeds", async () => {
    const generator = new FallbackCommentaryGenerator(new TemplateCommentaryGenerator(() => 0));
    const result = await generator.generate(input);
    expect(result.spokenText.length).toBeGreaterThan(0);
  });

  it("falls back to the template generator when the primary throws", async () => {
    const generator = new FallbackCommentaryGenerator(new ThrowingGenerator(), new TemplateCommentaryGenerator(() => 0));
    const result = await generator.generate(input);
    expect(result.spokenText.length).toBeGreaterThan(0);
  });
});
