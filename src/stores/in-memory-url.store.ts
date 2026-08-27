import type { ShortUrlRecord } from '../types/url';

export interface UrlStore {
  findByCode(code: string): ShortUrlRecord | undefined;
  save(record: ShortUrlRecord): void;
  incrementHits(code: string): ShortUrlRecord | undefined;
}

export class InMemoryUrlStore implements UrlStore {
  private readonly records = new Map<string, ShortUrlRecord>();

  findByCode(code: string): ShortUrlRecord | undefined {
    return this.records.get(code);
  }

  save(record: ShortUrlRecord): void {
    this.records.set(record.code, record);
  }

  incrementHits(code: string): ShortUrlRecord | undefined {
    const record = this.records.get(code);
    if (!record) return undefined;
    record.hits += 1;
    return record;
  }
}