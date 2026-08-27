import { UrlRecord } from '../types/url';

export class UrlStore {
  private readonly records = new Map<string, UrlRecord>();

  public get(code: string): UrlRecord | undefined {
    return this.records.get(code);
  }

  public has(code: string): boolean {
    return this.records.has(code);
  }

  public save(record: UrlRecord): void {
    if (this.records.has(record.code)) {
      throw new Error(`Code already exists: ${record.code}`);
    }
    this.records.set(record.code, { ...record });
  }

  public incrementHits(code: string): void {
    const record = this.records.get(code);
    if (record) record.hits += 1;
  }
}