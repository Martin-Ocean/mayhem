import type { HighlightType } from "../../highlights/types";
import type { Persona } from "../types";

/**
 * Phrasing bank for the template commentary generator, keyed by highlight type then persona.
 * Placeholders ({name}, {champion}, etc.) are substituted from the highlight's data +
 * resolved participant names before use. Multiple variants per (type, persona) pair so
 * announcements don't feel robotic even without an LLM.
 */
export const PHRASES: Record<HighlightType, Record<Persona, string[]>> = {
  multikill: {
    roast: [
      "{name} popped off with a {size}-kill on {champion} — somebody tell the enemy team to ward.",
      "{name} went full main-character energy with a {size}-kill on {champion}.",
    ],
    hypeCaster: [
      "OH IT'S A {SIZE}-KILL FOR {NAME} ON {CHAMPION}, LET'S GOOO!",
      "{name} just SLAMMED a {size}-kill on {champion}! Absolutely unreal!",
    ],
    deadpan: [
      "{name} got a {size}-kill on {champion}.",
      "Statistically notable: {name} secured a {size}-kill playing {champion}.",
    ],
  },
  carryMvp: {
    roast: [
      "{name} carried so hard on {champion} the rest of the team basically got a participation trophy.",
      "{name} went {kills}/{deaths}/{assists} on {champion} — the real MVP, the rest were passengers.",
    ],
    hypeCaster: [
      "AND THE MVP GOES TO {NAME} — {kills}/{deaths}/{assists} ON {CHAMPION}, WHAT A PERFORMANCE!",
      "{name} was an absolute problem on {champion} tonight. {kills} kills, unreal.",
    ],
    deadpan: [
      "{name} led the winning team with a {kills}/{deaths}/{assists} line on {champion}.",
      "MVP: {name} ({champion}), {kills}/{deaths}/{assists}.",
    ],
  },
  worstPerformer: {
    roast: [
      "{name} went {kills}/{deaths}/{assists} on {champion} — please just afk farm next time.",
      "{name} fed {deaths} deaths on {champion}. The enemy jungler sends their thanks.",
    ],
    hypeCaster: [
      "Rough night for {name} — {deaths} deaths on {champion}, we've all been there.",
      "{name} is having a {champion} game they'd probably like to forget.",
    ],
    deadpan: [
      "{name} finished {kills}/{deaths}/{assists} on {champion}.",
      "Lowest-impact performance: {name} ({champion}), {deaths} deaths.",
    ],
  },
  feeder: {
    roast: [
      "{name} donated {deaths} kills to the enemy team on {champion} — very generous of them.",
      "{name} treated {champion}'s deaths counter like a high score.",
    ],
    hypeCaster: [
      "{name} had a tough time staying alive on {champion} — {deaths} deaths tonight.",
      "It wasn't {name}'s night on {champion}.",
    ],
    deadpan: [
      "{name} died {deaths} times on {champion}, well above team average.",
      "{name}'s death count on {champion} was notably high this game.",
    ],
  },
  afkLeaver: {
    roast: [
      "{name} decided {champion} wasn't worth their time and dipped mid-game.",
      "{name} rage quit — or their PC did. Either way, {champion} took a nap.",
    ],
    hypeCaster: [
      "Uh oh, looks like {name} went AFK on {champion} — that's rough for the team.",
      "{name} disconnected partway through on {champion}.",
    ],
    deadpan: [
      "{name} was flagged as AFK/left the game while playing {champion}.",
      "Connection issue noted for {name} ({champion}).",
    ],
  },
  firstBlood: {
    roast: [
      "{name} drew first blood on {champion} — somebody was overconfident.",
      "First blood goes to {name} on {champion}. Rude.",
    ],
    hypeCaster: [
      "AND FIRST BLOOD GOES TO {NAME} ON {CHAMPION}!",
      "{name} opens the scoring with first blood on {champion}!",
    ],
    deadpan: [
      "First blood: {name} ({champion}).",
      "{name} recorded first blood on {champion}.",
    ],
  },
  stomp: {
    roast: [
      "That game was a {killDiff}-kill stomp. Somebody queue up therapy for the losing side.",
      "A {killDiff}-kill blowout — not exactly a nail-biter.",
    ],
    hypeCaster: [
      "That was a total stomp — a {killDiff}-kill difference by the end!",
      "One team absolutely ran that game, {killDiff} kills apart.",
    ],
    deadpan: [
      "Final kill differential: {killDiff}.",
      "The game ended as a decisive stomp, {killDiff} kills apart.",
    ],
  },
  nailBiter: {
    roast: [
      "That was way too close — only a {killDiff}-kill difference. Somebody's heart rate was up.",
      "A {killDiff}-kill nail-biter. Nobody could commit to actually winning.",
    ],
    hypeCaster: [
      "WHAT A CLOSE ONE — just {killDiff} kills separated these teams!",
      "That game came down to the wire, only {killDiff} kills apart!",
    ],
    deadpan: [
      "Final kill differential: {killDiff}. A close game.",
      "The teams finished within {killDiff} kills of each other.",
    ],
  },
  damageNoImpact: {
    roast: [
      "{name} put up huge damage on {champion} but somehow has nothing to show for it.",
      "All that damage from {name} on {champion} and the scoreboard barely noticed.",
    ],
    hypeCaster: [
      "{name} put up big damage numbers on {champion} tonight, even without the kills to match.",
      "{name} was dealing serious damage on {champion} all game.",
    ],
    deadpan: [
      "{name} had a high damage share on {champion} relative to kill participation.",
      "Notable damage output from {name} ({champion}) without matching kill involvement.",
    ],
  },
  visionOutlier: {
    roast: [
      "{name} had basically no vision on {champion} — did they forget wards exist?",
      "{name}'s vision score on {champion} suggests they were playing with the fog of war on purpose.",
    ],
    hypeCaster: [
      "{name} was lighting up the map with vision on {champion} tonight.",
      "Vision control from {name} ({champion}) stood out this game.",
    ],
    deadpan: [
      "{name}'s vision score on {champion} was notably {direction} relative to team average.",
      "Vision outlier: {name} ({champion}), {direction} vision score.",
    ],
  },
  supportMvp: {
    roast: [
      "{name} kept the whole team alive on {champion} — an unpaid healer union of one.",
      "{name} was basically a walking heal bot on {champion} this game.",
    ],
    hypeCaster: [
      "Shoutout to {name} — massive healing and shielding on {champion} kept the team in it!",
      "{name} was the backbone of that team on {champion}, healing and shielding nonstop.",
    ],
    deadpan: [
      "{name} led the game in healing/shielding on teammates while playing {champion}.",
      "Support MVP: {name} ({champion}).",
    ],
  },
  durationExtreme: {
    roast: [
      "That game dragged on forever — someone forgot how to end a game.",
      "Quick game tonight — over before anyone could get comfortable.",
    ],
    hypeCaster: [
      "That was a marathon of a match!",
      "That game was over in a flash!",
    ],
    deadpan: [
      "Game duration was notably {direction} relative to average.",
      "Match length: {direction} than typical.",
    ],
  },
  remakeContext: {
    roast: ["Well, that one didn't count — remake city.", "Nothing to see here, that game got remade."],
    hypeCaster: ["That one got remade — on to the next!", "Quick remake, no stats to report there."],
    deadpan: ["The game ended in a remake/early surrender.", "Match ended early — remake, no stats recorded."],
  },
};
