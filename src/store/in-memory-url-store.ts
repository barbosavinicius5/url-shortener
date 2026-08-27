import { ShortUrlRecord } from '../types';

export class InMemoryUrlStore {
  private readonly records = new Map<string, ShortUrlRecord>();

  findByCode(code: string): ShortUrlRecord | undefined {
    const record = this.records.get(code);
    return record ? { ...record } : undefined;
  }

  save(record: ShortUrlRecord): void {
    this.records.set(record.code, { ...record });
  }

  hasCode(code: string): boolean {
    return this.records.has(code);
  }

  incrementHits(code: string): ShortUrlRecord | undefined {
    const record = this.records.get(code);
    if (!record) {
      return undefined;
    }
    record.hits += 1;
    return { ...record };
  }
}