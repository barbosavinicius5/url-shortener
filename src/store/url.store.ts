import { UrlRecord } from '../types/url-record';

export class UrlStore {
  private readonly records = new Map<string, UrlRecord>();

  has(code: string): boolean {
    return this.records.has(code);
  }

  get(code: string): UrlRecord | undefined {
    return this.records.get(code);
  }

  set(record: UrlRecord): void {
    this.records.set(record.code, record);
  }

  incrementHits(code: string): UrlRecord | undefined {
    const record = this.records.get(code);
    if (!record) return undefined;
    record.hits += 1;
    return record;
  }
}