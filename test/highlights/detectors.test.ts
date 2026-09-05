import { describe, expect, it } from "vitest";
import { detectMultikills } from "../../src/main/highlights/detectors/multikill";
import { detectCarryMvp } from "../../src/main/highlights/detectors/carryMvp";
import { detectWorstPerformer } from "../../src/main/highlights/detectors/worstPerformer";
import { detectFeeder } from "../../src/main/highlights/detectors/feeder";
import { detectAfkLeaver } from "../../src/main/highlights/detectors/afkLeaver";
import { detectFirstBlood } from "../../src/main/highlights/detectors/firstBlood";
import { detectStompOrNailBiter } from "../../src/main/highlights/detectors/stomp";
import { detectDamageNoImpact } from "../../src/main/highlights/detectors/damageNoImpact";
import { detectVisionOutlier } from "../../src/main/highlights/detectors/visionOutlier";
import { detectSupportMvp } from "../../src/main/highlights/detectors/supportMvp";
import { detectDurationExtreme } from "../../src/main/highlights/detectors/durationExtreme";
import { buildTwoTeamSummary, makeParticipant } from "./helpers";

describe("detectMultikills", () => {
  it("flags a pentakill with the highest weight", () => {
    const summary = buildTwoTeamSummary(
      [{ pentaKills: 1 }, { quadraKills: 1 }, { tripleKills: 1 }],
      []
    );
    const highlights = detectMultikills(summary);
    expect(highlights).toHaveLength(3);
    const penta = highlights.find((h) => h.data.size === "penta")!;
    const quadra = highlights.find((h) => h.data.size === "quadra")!;
    expect(penta.weight).toBeGreaterThan(quadra.weight);
  });

  it("returns nothing when nobody multikilled", () => {
    const summary = buildTwoTeamSummary([{ kills: 1 }], []);
    expect(detectMultikills(summary)).toHaveLength(0);
  });
});

describe("detectCarryMvp", () => {
  it("picks the winning-team player with the best combined kp/damage/gold share", () => {
    const summary = buildTwoTeamSummary(
      [
        { kills: 15, assists: 5, damageDealtToChampions: 20000, goldEarned: 14000 },
        { kills: 2, assists: 3, damageDealtToChampions: 3000, goldEarned: 8000 },
      ],
      [{ kills: 5 }]
    );
    const [highlight] = detectCarryMvp(summary);
    expect(highlight.participants[0]).toBe(summary.participants[0].puuid);
  });

  it("returns nothing if there's no winning team", () => {
    const summary = buildTwoTeamSummary([{ win: false }], []);
    summary.teams = summary.teams.map((t) => ({ ...t, win: false }));
    expect(detectCarryMvp(summary)).toHaveLength(0);
  });
});

describe("detectWorstPerformer", () => {
  it("flags the highest-deaths, low-kill player, weighted toward the losing team", () => {
    const summary = buildTwoTeamSummary(
      [{ kills: 10, deaths: 2 }],
      [{ kills: 1, deaths: 12, assists: 1 }, { kills: 3, deaths: 4 }]
    );
    const [highlight] = detectWorstPerformer(summary);
    expect(highlight.participants[0]).toBe(summary.participants[1].puuid);
  });

  it("excludes AFK/leaver players so they aren't double-blamed", () => {
    const summary = buildTwoTeamSummary(
      [{ kills: 10, deaths: 2 }],
      [{ kills: 0, deaths: 15, wasAfk: true, leaver: true }, { kills: 2, deaths: 5 }]
    );
    const [highlight] = detectWorstPerformer(summary);
    expect(highlight.participants[0]).toBe(summary.participants[2].puuid);
  });
});

describe("detectFeeder", () => {
  it("flags deaths at least 2x team average with below-average kills", () => {
    const summary = buildTwoTeamSummary(
      [{ kills: 5, deaths: 2 }, { kills: 5, deaths: 2 }, { kills: 1, deaths: 10 }],
      []
    );
    const highlights = detectFeeder(summary);
    expect(highlights).toHaveLength(1);
    expect(highlights[0].participants[0]).toBe(summary.participants[2].puuid);
  });
});

describe("detectAfkLeaver", () => {
  it("flags every afk/leaver participant", () => {
    const summary = buildTwoTeamSummary([{ wasAfk: true }], [{ leaver: true }]);
    expect(detectAfkLeaver(summary)).toHaveLength(2);
  });
});

describe("detectFirstBlood", () => {
  it("flags the first-blood killer", () => {
    const summary = buildTwoTeamSummary([{ firstBloodKill: true }], []);
    const [highlight] = detectFirstBlood(summary);
    expect(highlight.participants[0]).toBe(summary.participants[0].puuid);
  });

  it("returns nothing if nobody has first blood recorded", () => {
    const summary = buildTwoTeamSummary([{}], []);
    expect(detectFirstBlood(summary)).toHaveLength(0);
  });
});

describe("detectStompOrNailBiter", () => {
  it("classifies a lopsided kill count as a stomp", () => {
    const summary = buildTwoTeamSummary([{ kills: 30 }], [{ kills: 5 }]);
    const [highlight] = detectStompOrNailBiter(summary);
    expect(highlight.type).toBe("stomp");
  });

  it("classifies a near-even kill count as a nail-biter", () => {
    const summary = buildTwoTeamSummary([{ kills: 20 }], [{ kills: 19 }]);
    const [highlight] = detectStompOrNailBiter(summary);
    expect(highlight.type).toBe("nailBiter");
  });

  it("returns nothing for a middling differential", () => {
    const summary = buildTwoTeamSummary([{ kills: 20 }], [{ kills: 14 }]);
    expect(detectStompOrNailBiter(summary)).toHaveLength(0);
  });
});

describe("detectDamageNoImpact", () => {
  it("flags high damage share with low kill participation", () => {
    const summary = buildTwoTeamSummary(
      [
        { kills: 1, assists: 0, damageDealtToChampions: 25000 },
        { kills: 8, assists: 2, damageDealtToChampions: 5000 },
      ],
      []
    );
    const [highlight] = detectDamageNoImpact(summary);
    expect(highlight.participants[0]).toBe(summary.participants[0].puuid);
  });
});

describe("detectVisionOutlier", () => {
  it("flags a notably low vision score relative to team average", () => {
    const summary = buildTwoTeamSummary(
      [{ visionScore: 30 }, { visionScore: 28 }, { visionScore: 2 }],
      []
    );
    const [highlight] = detectVisionOutlier(summary);
    expect(highlight.data.direction).toBe("low");
  });

  it("skips teams that barely ward at all", () => {
    const summary = buildTwoTeamSummary([{ visionScore: 1 }, { visionScore: 0 }], []);
    expect(detectVisionOutlier(summary)).toHaveLength(0);
  });
});

describe("detectSupportMvp", () => {
  it("flags the highest combined heal+shield-on-teammates", () => {
    const summary = buildTwoTeamSummary(
      [{ totalHealsOnTeammates: 4000, totalDamageShieldedOnTeammates: 1000 }, { totalHealsOnTeammates: 100 }],
      []
    );
    const [highlight] = detectSupportMvp(summary);
    expect(highlight.participants[0]).toBe(summary.participants[0].puuid);
  });

  it("returns nothing when nobody healed/shielded teammates", () => {
    const summary = buildTwoTeamSummary([{}], []);
    expect(detectSupportMvp(summary)).toHaveLength(0);
  });
});

describe("detectDurationExtreme", () => {
  it("flags a short game", () => {
    const summary = buildTwoTeamSummary([{}], [], { gameDuration: 700 });
    expect(detectDurationExtreme(summary)[0].data.direction).toBe("short");
  });

  it("flags a long game", () => {
    const summary = buildTwoTeamSummary([{}], [], { gameDuration: 2400 });
    expect(detectDurationExtreme(summary)[0].data.direction).toBe("long");
  });

  it("returns nothing for a typical-length game", () => {
    const summary = buildTwoTeamSummary([{}], [], { gameDuration: 1200 });
    expect(detectDurationExtreme(summary)).toHaveLength(0);
  });
});
