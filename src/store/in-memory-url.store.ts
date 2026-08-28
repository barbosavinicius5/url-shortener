import { UrlRecord } from "../types/url";

export class InMemoryUrlStore {
  private readonly records = new Map<string, UrlRecord>();

  create(code: string, url: string): UrlRecord {
    const record: UrlRecord = { code, url, hits: 0 };
    this.records.set(code, record);
    return record;
  }

  findByCode(code: string): UrlRecord | undefined {
    return this.records.get(code);
  }

  incrementHits(code: string): void {
    const record = this.records.get(code);
    if (record) {
      record.hits += 1;
    }
  }
}