import { UrlRecord } from '../types/url.types';

export class InMemoryUrlStore {
  private readonly records = new Map<string, UrlRecord>();

  create(record: UrlRecord): UrlRecord {
    if (this.records.has(record.code)) {
      throw new Error(`Code already exists: ${record.code}`);
    }
    this.records.set(record.code, { ...record });
    return { ...record };
  }

  findByCode(code: string): UrlRecord | undefined {
    const record = this.records.get(code);
    return record ? { ...record } : undefined;
  }

  incrementHits(code: string): UrlRecord | undefined {
    const record = this.records.get(code);
    if (!record) return undefined;
    record.hits += 1;
    return { ...record };
  }
}
