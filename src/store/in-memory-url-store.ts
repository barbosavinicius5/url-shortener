import type { ShortUrlRecord, UrlStore } from '../types/short-url';

/**
 * In-memory store backed by a Map, keyed by the short code.
 * Each app instance gets its own store, so records only live
 * for the lifetime of the process.
 */
export class InMemoryUrlStore implements UrlStore {
  private readonly records = new Map<string, ShortUrlRecord>();

  save(record: ShortUrlRecord): void {
    this.records.set(record.code, { ...record });
  }

  findByCode(code: string): ShortUrlRecord | undefined {
    const record = this.records.get(code);
    return record ? { ...record } : undefined;
  }

  incrementHits(code: string): ShortUrlRecord | undefined {
    const record = this.records.get(code);
    if (!record) {
      return undefined;
    }

    record.hits += 1;
    this.records.set(code, record);
    return { ...record };
  }
}