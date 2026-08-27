import { UrlRecord, UrlStore } from '../types/url';

export class InMemoryUrlStore implements UrlStore {
  private readonly records = new Map<string, UrlRecord>();

  create(record: UrlRecord): void {
    if (this.records.has(record.code)) {
      throw new Error(`Code "${record.code}" already exists`);
    }
    this.records.set(record.code, { ...record });
  }

  findByCode(code: string): UrlRecord | undefined {
    const record = this.records.get(code);
    if (!record) return undefined;
    return { ...record };
  }

  incrementHits(code: string): UrlRecord | undefined {
    const record = this.records.get(code);
    if (!record) return undefined;
    record.hits += 1;
    return { ...record };
  }
}