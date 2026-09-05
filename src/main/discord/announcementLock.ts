/**
 * Per-guild mutex so two near-simultaneous match reports for the same guild can't race the
 * bot into joining two voice channels at once. In-memory for MVP; the same interface would
 * back onto a Redis-based lock if this ever runs across multiple processes.
 */
export class GuildAnnouncementLock {
  private tails = new Map<string, Promise<unknown>>();

  async run<T>(guildId: string, fn: () => Promise<T>): Promise<T> {
    const previous = this.tails.get(guildId) ?? Promise.resolve();
    const current = previous.then(fn, fn);
    this.tails.set(
      guildId,
      current.catch(() => undefined)
    );
    return current;
  }
}
