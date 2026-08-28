import type { UrlRecord, UrlStore } from "../types/url.js";

export class InMemoryUrlStore implements UrlStore {
  private readonly records = new Map<string, UrlRecord>();

  save(url: string, code: string): UrlRecord {
    const record: UrlRecord = { code, url, hits: 0 };
    this.records.set(code, record);
    return record;
  }

  find(code: string): UrlRecord | undefined {
    return this.records.get(code);
  }

  incrementHits(code: string): UrlRecord | undefined {
    const record = this.records.get(code);
    if (!record) {
      return undefined;
    }
    record.hits += 1;
    return { code: record.code, url: record.url, hits: record.hits };
  }
}