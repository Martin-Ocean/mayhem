import type { MatchSummary } from "../../match/types";
import type { Highlight } from "../types";

/** Penta/quadra/triple kills — always interesting, weighted by size. */
export function detectMultikills(summary: MatchSummary): Highlight[] {
  const highlights: Highlight[] = [];

  for (const p of summary.participants) {
    if (p.pentaKills > 0) {
      highlights.push({
        type: "multikill",
        weight: 100,
        participants: [p.puuid],
        data: { size: "penta", championName: p.championName },
      });
    } else if (p.quadraKills > 0) {
      highlights.push({
        type: "multikill",
        weight: 70,
        participants: [p.puuid],
        data: { size: "quadra", championName: p.championName },
      });
    } else if (p.tripleKills > 0) {
      highlights.push({
        type: "multikill",
        weight: 40,
        participants: [p.puuid],
        data: { size: "triple", championName: p.championName },
      });
    }
  }

  return highlights;
}
