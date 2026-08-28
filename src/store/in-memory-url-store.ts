import type { UrlRecord } from '../types/url-record.js';

export class InMemoryUrlStore {
  private readonly records = new Map<string, UrlRecord>();

  save(record: UrlRecord): void {
    this.records.set(record.code, { ...record });
  }

  findByCode(code: string): UrlRecord | undefined {
    const record = this.records.get(code);
    if (record === undefined) {
      return undefined;
    }
    return { ...record };
  }

  incrementHits(code: string): UrlRecord | undefined {
    const record = this.records.get(code);
    if (record === undefined) {
      return undefined;
    }
    record.hits += 1;
    return { ...record };
  }
}