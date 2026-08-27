import type { ShortUrlRecord, ShortUrlStore } from "../types";

/**
 * Volatile in-memory store backed by a Map. The key is the short code itself.
 * All data disappears when the process restarts.
 */
export class InMemoryShortUrlStore implements ShortUrlStore {
  private readonly records = new Map<string, ShortUrlRecord>();

  get(code: string): ShortUrlRecord | undefined {
    return this.records.get(code);
  }

  has(code: string): boolean {
    return this.records.has(code);
  }

  set(code: string, record: ShortUrlRecord): void {
    this.records.set(code, record);
  }

  /** Increments the hit counter exactly once and only when the code exists. */
  incrementHits(code: string): ShortUrlRecord | undefined {
    const record = this.records.get(code);
    if (!record) {
      return undefined;
    }
    record.hits += 1;
    return record;
  }
}