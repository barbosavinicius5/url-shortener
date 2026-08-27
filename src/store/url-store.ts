import { ShortenedUrl } from '../types/url';

export class UrlStore {
  private readonly urls = new Map<string, ShortenedUrl>();

  save(code: string, url: string): ShortenedUrl {
    const record: ShortenedUrl = { code, url, hits: 0 };
    this.urls.set(code, record);
    return record;
  }

  findByCode(code: string): ShortenedUrl | undefined {
    return this.urls.get(code);
  }

  incrementHits(code: string): ShortenedUrl | undefined {
    const record = this.urls.get(code);
    if (!record) return undefined;
    record.hits += 1;
    return record;
  }
}