import type { UrlRecord, UrlStore } from '../types/url.js';

export class InMemoryUrlStore implements UrlStore {
  private readonly records = new Map<string, UrlRecord>();

  get(code: string): UrlRecord | undefined {
    return this.records.get(code);
  }

  save(record: UrlRecord): void {
    this.records.set(record.code, record);
  }

  has(code: string): boolean {
    return this.records.has(code);
  }
}