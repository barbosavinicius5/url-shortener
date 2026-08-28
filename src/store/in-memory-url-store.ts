import { UrlRecord } from '../types/url';
import { UrlStore } from './url-store';

export class InMemoryUrlStore implements UrlStore {
  private readonly records: Map<string, UrlRecord> = new Map();

  create(record: UrlRecord): void {
    this.records.set(record.code, record);
  }

  findByCode(code: string): UrlRecord | undefined {
    return this.records.get(code);
  }

  incrementHits(code: string): UrlRecord | undefined {
    const record = this.records.get(code);
    if (record === undefined) {
      return undefined;
    }
    record.hits += 1;
    return record;
  }
}