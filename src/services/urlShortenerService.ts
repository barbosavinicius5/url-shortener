import { InMemoryUrlStore } from '../store/inMemoryUrlStore';
import { UrlRecord, ShortenResponse, StatsResponse } from '../types/url';

export class UrlShortenerService {
  private store: InMemoryUrlStore;
  private baseUrl: string;

  constructor(store: InMemoryUrlStore, baseUrl: string) {
    this.store = store;
    this.baseUrl = baseUrl;
  }

  shortenUrl(url: string): ShortenResponse {
    const code = this.store.generateCode();
    this.store.create(code, url);
    return {
      code,
      shortUrl: `${this.baseUrl}/${code}`,
    };
  }

  redirect(code: string): UrlRecord | undefined {
    const record = this.store.findByCode(code);
    if (record) {
      this.store.incrementHits(code);
      return this.store.findByCode(code);
    }
    return undefined;
  }

  getStats(code: string): StatsResponse | undefined {
    const record = this.store.findByCode(code);
    return record;
  }
}