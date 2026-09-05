import type { Highlight, HighlightType } from "../highlights/types";
import { PHRASES } from "./templates/phrases";
import type { CommentaryGenerator, CommentaryInput, CommentaryResult } from "./types";
import { resolveDisplayName } from "./types";

const TITLE_LABELS: Partial<Record<HighlightType, string>> = {
  multikill: "🔥 Multikill Alert",
  carryMvp: "🏆 MVP Performance",
  stomp: "💥 Total Stomp",
  nailBiter: "😰 Nail-Biter",
  afkLeaver: "🚨 Someone Bailed",
  supportMvp: "💚 Support MVP",
  remakeContext: "🔁 Remake",
};

const TYPE_EMOJI: Record<HighlightType, string> = {
  multikill: "🔥",
  carryMvp: "🏆",
  worstPerformer: "💀",
  feeder: "🍗",
  afkLeaver: "🚨",
  firstBlood: "🩸",
  stomp: "💥",
  nailBiter: "😰",
  damageNoImpact: "📊",
  visionOutlier: "👁️",
  supportMvp: "💚",
  durationExtreme: "⏱️",
  remakeContext: "🔁",
};

type RandomFn = () => number;

function pick<T>(items: T[], random: RandomFn): T {
  return items[Math.floor(random() * items.length)];
}

function fillTemplate(template: string, values: Record<string, string | number | boolean>): string {
  return template.replace(/\{([A-Za-z]+)\}/g, (_match, key: string) => {
    // A fully-uppercase placeholder (e.g. {SIZE}, {NAME}) is shout-case for hype-caster
    // phrasing — look up its lowercase counterpart and re-uppercase the value. Anything else
    // (including camelCase keys like {killDiff}) is looked up as-is.
    const isShoutCase = key === key.toUpperCase() && key !== key.toLowerCase();
    const lookupKey = isShoutCase ? key.toLowerCase() : key;
    const value = values[lookupKey];
    if (value === undefined) return "";
    return isShoutCase ? String(value).toUpperCase() : String(value);
  });
}

function valuesForHighlight(h: Highlight, input: CommentaryInput): Record<string, string | number | boolean> {
  const name = h.participants[0] ? resolveDisplayName(h.participants[0], input) : "";
  return {
    name,
    champion: (h.data.championName as string) ?? "",
    ...h.data,
  };
}

function lineFor(h: Highlight, input: CommentaryInput, random: RandomFn): string {
  const template = pick(PHRASES[h.type][input.persona], random);
  return fillTemplate(template, valuesForHighlight(h, input));
}

function buildTitle(input: CommentaryInput): string {
  const top = input.highlights[0];
  if (!top) {
    const won = input.summary.teams.some((t) => t.win);
    return `${input.summary.modeName} — ${won ? "Victory" : "Defeat"}`;
  }
  return TITLE_LABELS[top.type] ?? `${input.summary.modeName} Recap`;
}

/**
 * Deterministic, hand-written template commentary — the real v1 default (not a dev-only
 * fallback). No external API, no cost, works fully offline. `random` is injectable so tests
 * can assert on specific phrasing without flakiness.
 */
export class TemplateCommentaryGenerator implements CommentaryGenerator {
  constructor(private readonly random: RandomFn = Math.random) {}

  async generate(input: CommentaryInput): Promise<CommentaryResult> {
    if (input.summary.isRemake || input.highlights[0]?.type === "remakeContext") {
      const line = lineFor(input.highlights[0], input, this.random);
      return { title: TITLE_LABELS.remakeContext!, embedBody: line, spokenText: line };
    }

    const lines = input.highlights.map((h) => lineFor(h, input, this.random));

    return {
      title: buildTitle(input),
      embedBody: input.highlights.map((h, i) => `${TYPE_EMOJI[h.type]} ${lines[i]}`).join("\n"),
      spokenText: lines.join(" "),
    };
  }
}
