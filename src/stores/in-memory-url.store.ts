import type { UrlRecord, UrlStore } from "../types/url.js";

export class InMemoryUrlStore implements UrlStore {
  private readonly records = new Map<string, UrlRecord>();

  has(code: string): boolean {
    return this.records.has(code);
  }

  findByCode(code: string): UrlRecord | undefined {
    return this.records.get(code);
  }

  create(record: UrlRecord): void {
    if (this.records.has(record.code)) {
      throw new Error(`Code already exists: ${record.code}`);
    }

    this.records.set(record.code, record);
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