import { buildPrompt } from "./promptBuilder";
import type { CommentaryGenerator, CommentaryInput, CommentaryResult } from "./types";

export interface AnthropicGeneratorOptions {
  apiKey: string;
  model?: string;
}

/**
 * Placeholder/scaffold for the AI commentary path — NOT YET IMPLEMENTED.
 *
 * The UI's commentary-source toggle only offers "template" for now (see the Electron shell
 * settings view); this class exists so turning AI commentary on later is "implement this one
 * file," not a pipeline redesign. Intended real implementation, once picked up:
 *
 *   1. buildPrompt(input) -> { system, user } (already implemented, unit-tested via
 *      promptBuilder snapshot tests).
 *   2. Call the Anthropic Messages API with a forced tool-use call whose input schema is
 *      { title: string, embedBody: string, spokenText: string } — this avoids parsing free
 *      text out of a markdown-fenced response.
 *   3. Validate the tool call's input against that shape before returning it as
 *      CommentaryResult.
 *   4. Callers (see commentaryGenerator.ts's createFallbackCommentaryGenerator) already wrap
 *      this in a try/catch that falls back to TemplateCommentaryGenerator on any error or
 *      timeout, so failure here never blocks an announcement from going out.
 */
export class AnthropicCommentaryGenerator implements CommentaryGenerator {
  constructor(private readonly options: AnthropicGeneratorOptions) {}

  async generate(input: CommentaryInput): Promise<CommentaryResult> {
    // Prompt construction already works; wire up the actual API call here when this path
    // is implemented. Left as an explicit prompt build (rather than unused-var) so it's
    // obvious this scaffold is one function call away from working.
    buildPrompt(input);
    throw new NotImplementedError();
  }
}

export class NotImplementedError extends Error {
  constructor() {
    super("AI commentary generation is not implemented yet — use TemplateCommentaryGenerator.");
    this.name = "NotImplementedError";
  }
}
