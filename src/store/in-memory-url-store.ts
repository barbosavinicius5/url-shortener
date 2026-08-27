import type { ShortUrlRecord } from '../types/short-url.js';

export interface UrlStore {
  save(record: ShortUrlRecord): void;
  findByCode(code: string): ShortUrlRecord | undefined;
  incrementHits(code: string): ShortUrlRecord | undefined;
}

export class InMemoryUrlStore implements UrlStore {
  private store = new Map<string, ShortUrlRecord>();

  save(record: ShortUrlRecord): void {
    this.store.set(record.code, record);
  }

  findByCode(code: string): ShortUrlRecord | undefined {
    return this.store.get(code);
  }

  incrementHits(code: string): ShortUrlRecord | undefined {
    const record = this.store.get(code);
    if (record) {
      record.hits += 1;
    }
    return record;
  }
}