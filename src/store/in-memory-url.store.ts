import { UrlShortenerRecord } from '../types/url-shortener';

export class InMemoryUrlStore {
  private readonly records = new Map<string, UrlShortenerRecord>();

  save(record: UrlShortenerRecord): void {
    this.records.set(record.code, { ...record });
  }

  findByCode(code: string): UrlShortenerRecord | undefined {
    const record = this.records.get(code);
    return record ? { ...record } : undefined;
  }

  incrementHits(code: string): UrlShortenerRecord | undefined {
    const record = this.records.get(code);
    if (!record) return undefined;
    record.hits += 1;
    return { ...record };
  }
}