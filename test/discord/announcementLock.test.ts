import { describe, expect, it } from "vitest";
import { GuildAnnouncementLock } from "../../src/main/discord/announcementLock";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("GuildAnnouncementLock", () => {
  it("serializes concurrent runs for the same guild", async () => {
    const lock = new GuildAnnouncementLock();
    const order: string[] = [];

    const a = lock.run("guild-1", async () => {
      order.push("a-start");
      await sleep(30);
      order.push("a-end");
    });
    const b = lock.run("guild-1", async () => {
      order.push("b-start");
      await sleep(5);
      order.push("b-end");
    });

    await Promise.all([a, b]);
    expect(order).toEqual(["a-start", "a-end", "b-start", "b-end"]);
  });

  it("does not serialize runs across different guilds", async () => {
    const lock = new GuildAnnouncementLock();
    const order: string[] = [];

    const a = lock.run("guild-1", async () => {
      order.push("a-start");
      await sleep(30);
      order.push("a-end");
    });
    const b = lock.run("guild-2", async () => {
      order.push("b-start");
      await sleep(5);
      order.push("b-end");
    });

    await Promise.all([a, b]);
    expect(order.slice(0, 2)).toEqual(["a-start", "b-start"]);
  });

  it("continues serializing later runs even after an earlier one throws", async () => {
    const lock = new GuildAnnouncementLock();
    const failing = lock.run("guild-1", async () => {
      throw new Error("boom");
    });
    await expect(failing).rejects.toThrow("boom");

    const order: string[] = [];
    await lock.run("guild-1", async () => {
      order.push("ran-after-failure");
    });
    expect(order).toEqual(["ran-after-failure"]);
  });
});
