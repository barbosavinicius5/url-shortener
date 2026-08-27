import { UrlStore } from '../store/url.store';
import { CreateShortUrlResponse, UrlStatsResponse } from '../types/url';
import { generateUniqueCode } from './url-code.service';
import { isValidUrl } from '../validation/url.validation';

export class UrlService {
  public constructor(private readonly store: UrlStore, private readonly port: number) {}

  public create(url: unknown): CreateShortUrlResponse {
    if (!isValidUrl(url) || url.length === 0) throw new Error('A valid http:// or https:// URL is required');
    const code = generateUniqueCode(this.store);
    this.store.save({ code, url, hits: 0 });
    return { code, shortUrl: `http://localhost:${this.port}/${code}` };
  }

  public redirect(code: string): string | undefined {
    const record = this.store.get(code);
    if (!record) return undefined;
    this.store.incrementHits(code);
    return record.url;
  }

  public getStats(code: string): UrlStatsResponse | undefined {
    const record = this.store.get(code);
    return record ? { code: record.code, url: record.url, hits: record.hits } : undefined;
  }
}