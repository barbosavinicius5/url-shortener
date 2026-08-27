import { ShortUrlRecord } from '../types';

export class UrlStore {
  private readonly records = new Map<string, ShortUrlRecord>();

  create(record: ShortUrlRecord): void {
    this.records.set(record.code, record);
  }

  findByCode(code: string): ShortUrlRecord | undefined {
    return this.records.get(code);
  }

  incrementHits(code: string): ShortUrlRecord | undefined {
    const record = this.records.get(code);
    if (record === undefined) {
      return undefined;
    }
    record.hits += 1;
    return record;
  }

  clear(): void {
    this.records.clear();
  }
}