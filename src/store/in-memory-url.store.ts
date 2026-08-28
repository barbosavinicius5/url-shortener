import type { ShortUrlRecord, UrlStore } from "../types/url";

export class InMemoryUrlStore implements UrlStore {
  private readonly records = new Map<string, ShortUrlRecord>();

  save(record: ShortUrlRecord): void {
    this.records.set(record.code, record);
  }

  findByCode(code: string): ShortUrlRecord | undefined {
    return this.records.get(code);
  }

  incrementHits(code: string): void {
    const record = this.records.get(code);
    if (record) {
      record.hits += 1;
    }
  }

  clear(): void {
    this.records.clear();
  }
}