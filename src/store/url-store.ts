import type { UrlRecord } from '../types/url.js';

export class UrlStore {
  private readonly records = new Map<string, UrlRecord>();

  save(record: UrlRecord): void {
    this.records.set(record.code, record);
  }

  findByCode(code: string): UrlRecord | undefined {
    return this.records.get(code);
  }

  incrementHits(code: string): UrlRecord | undefined {
    const record = this.records.get(code);
    if (!record) return undefined;
    record.hits += 1;
    return record;
  }
}