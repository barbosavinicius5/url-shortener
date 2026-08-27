import { UrlRecord, UrlStore } from '../types/url';

export class InMemoryUrlStore implements UrlStore {
  private readonly records = new Map<string, UrlRecord>();

  get(code: string): UrlRecord | undefined {
    return this.records.get(code);
  }

  save(record: UrlRecord): void {
    this.records.set(record.code, record);
  }

  incrementHits(code: string): UrlRecord | undefined {
    const record = this.records.get(code);
    if (!record) return undefined;
    record.hits += 1;
    return record;
  }
}