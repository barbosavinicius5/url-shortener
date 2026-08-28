import { ShortUrlRecord } from '../types/url';

export class InMemoryUrlStore {
  private readonly records = new Map<string, ShortUrlRecord>();

  public hasCode(code: string): boolean {
    return this.records.has(code);
  }

  public create(record: ShortUrlRecord): void {
    this.records.set(record.code, { ...record });
  }

  public findByCode(code: string): ShortUrlRecord | null {
    const record = this.records.get(code);
    if (!record) {
      return null;
    }
    return { ...record };
  }

  public incrementHits(code: string): ShortUrlRecord | null {
    const record = this.records.get(code);
    if (!record) {
      return null;
    }
    record.hits += 1;
    return { ...record };
  }
}