import type { UrlRecord } from '../types/url.js';

export class UrlStore {
  private readonly records = new Map<string, UrlRecord>();

  get(code: string): UrlRecord | undefined {
    return this.records.get(code);
  }

  has(code: string): boolean {
    return this.records.has(code);
  }

  save(record: UrlRecord): void {
    this.records.set(record.code, record);
  }
}