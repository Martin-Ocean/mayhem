import { TemplateCommentaryGenerator } from "./templateGenerator";
import { AnthropicCommentaryGenerator, type AnthropicGeneratorOptions } from "./anthropicGenerator";
import type { CommentaryGenerator, CommentaryInput, CommentaryResult } from "./types";

export type CommentarySource = "template" | "ai";

export interface CommentaryGeneratorConfig {
  source: CommentarySource;
  ai?: AnthropicGeneratorOptions;
}

/**
 * Always tries the configured source first; if AI is selected and the call errors or times
 * out, falls back to the template generator so an announcement goes out regardless.
 */
export class FallbackCommentaryGenerator implements CommentaryGenerator {
  constructor(
    private readonly primary: CommentaryGenerator,
    private readonly fallback: CommentaryGenerator = new TemplateCommentaryGenerator()
  ) {}

  async generate(input: CommentaryInput): Promise<CommentaryResult> {
    try {
      return await this.primary.generate(input);
    } catch {
      return this.fallback.generate(input);
    }
  }
}

export function createCommentaryGenerator(config: CommentaryGeneratorConfig): CommentaryGenerator {
  if (config.source === "template") {
    return new TemplateCommentaryGenerator();
  }

  if (!config.ai) {
    throw new Error("commentarySource is \"ai\" but no AI generator options were provided");
  }

  return new FallbackCommentaryGenerator(new AnthropicCommentaryGenerator(config.ai));
}
