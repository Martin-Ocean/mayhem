import { describe, expect, it } from "vitest";
import { selectVoiceChannelId, type VoiceStateLike } from "../../src/main/discord/voiceDelivery";

function state(channelId: string | null, displayName?: string, username?: string): VoiceStateLike {
  return {
    channelId,
    member: displayName ? { displayName, user: { username: username ?? displayName } } : null,
  };
}

describe("selectVoiceChannelId", () => {
  it("prefers an explicitly configured channel id over auto-detection", () => {
    const result = selectVoiceChannelId([state("chan-a", "Alice")], "chan-configured", ["Alice"]);
    expect(result).toBe("chan-configured");
  });

  it("auto-detects the channel containing a tracked friend by display name", () => {
    const states = [state("chan-a", "RandomPerson"), state("chan-b", "Alice")];
    expect(selectVoiceChannelId(states, undefined, ["Alice"])).toBe("chan-b");
  });

  it("matches case-insensitively and falls back to username", () => {
    const states = [state("chan-a", "AliceNickname", "alice")];
    expect(selectVoiceChannelId(states, undefined, ["ALICE"])).toBe("chan-a");
  });

  it("returns undefined when nobody tracked is in any voice channel", () => {
    const states = [state("chan-a", "RandomPerson")];
    expect(selectVoiceChannelId(states, undefined, ["Alice"])).toBeUndefined();
  });

  it("skips voice states with no channel or no member", () => {
    const states: VoiceStateLike[] = [state(null, "Alice"), { channelId: "chan-a", member: null }];
    expect(selectVoiceChannelId(states, undefined, ["Alice"])).toBeUndefined();
  });
});
