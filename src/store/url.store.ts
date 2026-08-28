import type { ShortUrlRecord } from '../types/url.js';

/**
 * Thin persistence abstraction over the in-memory storage.
 * The production implementation keeps records in a `Map`; nothing is ever
 * written to disk and no external service is contacted.
 */
export interface UrlStore {
  has(code: string): boolean;
  create(record: ShortUrlRecord): void;
  get(code: string): ShortUrlRecord | undefined;
  incrementHits(code: string): void;
}

/** In-memory `Map`-backed implementation of {@link UrlStore}. */
export class InMemoryUrlStore implements UrlStore {
  private readonly records = new Map<string, ShortUrlRecord>();

  has(code: string): boolean {
    return this.records.has(code);
  }

  create(record: ShortUrlRecord): void {
    this.records.set(record.code, { ...record, hits: 0 });
  }

  get(code: string): ShortUrlRecord | undefined {
    const record = this.records.get(code);
    return record === undefined ? undefined : { ...record };
  }

  incrementHits(code: string): void {
    const record = this.records.get(code);
    if (record !== undefined) {
      record.hits += 1;
    }
  }
}

/** Creates a fresh, isolated store. Every app instance owns exactly one store. */
export function createUrlStore(): UrlStore {
  return new InMemoryUrlStore();
}