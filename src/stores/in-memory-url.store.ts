import { UrlRecord } from '../types/url';

export class InMemoryUrlStore {
  private readonly records = new Map<string, UrlRecord>();

  save(record: UrlRecord): void {
    this.records.set(record.code, record);
  }

  findByCode(code: string): UrlRecord | undefined {
    return this.records.get(code);
  }

  incrementHits(code: string): UrlRecord | undefined {
    const record = this.records.get(code);
    if (!record) {
      return undefined;
    }
    const updated: UrlRecord = { ...record, hits: record.hits + 1 };
    this.records.set(code, updated);
    return updated;
  }
}