import { UrlRecord } from '../types';

/**
 * In-memory store for short URL records.
 *
 * The `Map` is the single source of truth for the process lifetime. No external
 * database, Redis, filesystem or SDK is used. The store exposes small, typed
 * operations so callers never touch the raw `Map` directly.
 */
export class UrlStore {
  private readonly records = new Map<string, UrlRecord>();

  /** Returns the record for `code`, or `undefined` if absent. */
  get(code: string): UrlRecord | undefined {
    return this.records.get(code);
  }

  /** Whether a record exists for `code`. */
  has(code: string): boolean {
    return this.records.has(code);
  }

  /** Inserts or replaces the record for its `code`. */
  save(record: UrlRecord): UrlRecord {
    this.records.set(record.code, record);
    return record;
  }

  /**
   * Increments the hit count of an existing record exactly once.
   * Returns the updated record, or `undefined` if the code does not exist
   * (the caller is responsible for responding 404).
   */
  incrementHits(code: string): UrlRecord | undefined {
    const record = this.records.get(code);
    if (!record) {
      return undefined;
    }
    record.hits += 1;
    return record;
  }

  /** Removes all records (primarily for test isolation). */
  clear(): void {
    this.records.clear();
  }
}