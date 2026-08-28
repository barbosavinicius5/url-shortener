import { ShortUrlRecord } from '../models/url-shortener';

export class UrlStore {
  private readonly records = new Map<string, ShortUrlRecord>();

  save(record: ShortUrlRecord): void {
    this.records.set(record.code, record);
  }

  findByCode(code: string): ShortUrlRecord | undefined {
    return this.records.get(code);
  }

  incrementHits(code: string): ShortUrlRecord | undefined {
    const record = this.records.get(code);
    if (!record) return undefined;
    record.hits += 1;
    return record;
  }
}