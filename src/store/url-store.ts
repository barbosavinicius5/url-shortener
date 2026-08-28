import { UrlRecord } from '../types/url.js';

/**
 * In-memory store for shortened URLs backed by a `Map` keyed by short code.
 * This is the only persistence of the service: data lives while the process lives.
 */
export class UrlStore {
  private readonly records: Map<string, UrlRecord>;

  constructor(initialRecords?: Iterable<[string, UrlRecord]>) {
    this.records = new Map<string, UrlRecord>(initialRecords);
  }

  has(code: string): boolean {
    return this.records.has(code);
  }

  /** Inserts a record; the caller is responsible for code uniqueness. */
  save(record: UrlRecord): void {
    this.records.set(record.code, { ...record });
  }

  /** Returns a defensive copy so callers cannot mutate stored state. */
  findByCode(code: string): UrlRecord | undefined {
    const record = this.records.get(code);
    return record ? { ...record } : undefined;
  }

  /** Increments the hit counter of an existing record (no-op when unknown). */
  incrementHits(code: string): void {
    const record = this.records.get(code);
    if (record) {
      record.hits += 1;
    }
  }

  get size(): number {
    return this.records.size;
  }
}