import { UrlRecord, UrlStore } from '../types';

export class InMemoryUrlStore implements UrlStore {
  private readonly records = new Map<string, UrlRecord>();

  create(record: UrlRecord): void {
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
    record.hits += 1;
    return record;
  }
}