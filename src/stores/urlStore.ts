import { ShortUrlRecord } from '../types/url';

/**
 * In-memory store for shortened URL records.
 *
 * Each instance represents a single process execution. It encapsulates a
 * `Map<string, ShortUrlRecord>` keyed by the short code and never exposes the
 * raw map nor allows external mutation of the stored records.
 */
export class UrlStore {
  private readonly records: Map<string, ShortUrlRecord> = new Map();

  save(record: ShortUrlRecord): void {
    this.records.set(record.code, record);
  }

  findByCode(code: string): ShortUrlRecord | undefined {
    const found = this.records.get(code);
    return found ? { ...found } : undefined;
  }

  exists(code: string): boolean {
    return this.records.has(code);
  }

  /**
   * Increments the hit counter of an existing record exactly once and returns
   * an immutable copy of the updated record. Returns `undefined` when the code
   * does not exist.
   */
  incrementHits(code: string): ShortUrlRecord | undefined {
    const found = this.records.get(code);
    if (!found) {
      return undefined;
    }
    found.hits += 1;
    return { ...found };
  }
}