import type { UrlRecord } from '../types/url';

/**
 * In-memory store for shortened URLs.
 *
 * The only mutable state of the application lives here, in a `Map` keyed by the
 * 6-character short code. No external storage, filesystem or network is used.
 */
export class InMemoryUrlStore {
  private readonly records = new Map<string, UrlRecord>();

  /** Persists a new URL/code pair and returns a copy of the stored record. */
  create(url: string, code: string): UrlRecord {
    const record: UrlRecord = { code, url, hits: 0 };
    this.records.set(code, record);
    return { ...record };
  }

  /** Reads a record without mutating it. Returns a copy (or undefined). */
  findByCode(code: string): UrlRecord | undefined {
    const record = this.records.get(code);
    return record ? { ...record } : undefined;
  }

  /**
   * Increments the hit counter for an existing code exactly once and returns the
   * updated record, or `undefined` when the code is unknown.
   */
  incrementHits(code: string): UrlRecord | undefined {
    const record = this.records.get(code);
    if (!record) {
      return undefined;
    }
    record.hits += 1;
    this.records.set(code, record);
    return { ...record };
  }

  /** Whether the given code already exists. */
  hasCode(code: string): boolean {
    return this.records.has(code);
  }
}