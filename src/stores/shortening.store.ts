import type { ShorteningRecord } from "../types/shortening";

/**
 * In-memory store for shortening records. The Map is fully encapsulated:
 * routes and services never touch the underlying structure directly.
 * Data lives only for the lifetime of the process.
 */
export class ShorteningStore {
  private readonly records: Map<string, ShorteningRecord>;

  constructor() {
    this.records = new Map<string, ShorteningRecord>();
  }

  /** Inserts or replaces the record indexed by its own code. */
  save(record: ShorteningRecord): void {
    this.records.set(record.code, { ...record });
  }

  /** Returns a copy of the record stored under the given code, if any. */
  findByCode(code: string): ShorteningRecord | undefined {
    const record = this.records.get(code);
    return record === undefined ? undefined : { ...record };
  }

  /** Increments the hit counter of the given code and returns the updated copy. */
  incrementHits(code: string): ShorteningRecord | undefined {
    const record = this.records.get(code);
    if (record === undefined) {
      return undefined;
    }
    record.hits += 1;
    return { ...record };
  }

  /** Removes every record; handy to reset state between tests. */
  clear(): void {
    this.records.clear();
  }
}