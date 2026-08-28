import { UrlRecord } from '../types/url';

export class InMemoryUrlStore {
  private readonly urls = new Map<string, UrlRecord>();

  save(record: UrlRecord): UrlRecord {
    this.urls.set(record.code, record);
    return record;
  }

  findByCode(code: string): UrlRecord | undefined {
    return this.urls.get(code);
  }

  incrementHits(code: string): UrlRecord | undefined {
    const record = this.urls.get(code);
    if (!record) {
      return undefined;
    }
    record.hits += 1;
    return record;
  }
}