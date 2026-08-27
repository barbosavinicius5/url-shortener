import crypto from 'crypto';
import { ShortUrlRecord, CreateShortUrlResponse, UrlShortenerConfig } from '../types';
import { InMemoryUrlStore } from '../store/in-memory-url-store';

const CODE_LENGTH = 6;
const ALPHANUMERIC_CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export class UrlShortenerService {
  private readonly store: InMemoryUrlStore;
  private readonly port: number;

  constructor(store: InMemoryUrlStore, config: UrlShortenerConfig) {
    this.store = store;
    this.port = config.port;
  }

  private generateCode(): string {
    let code: string;
    do {
      let result = '';
      for (let i = 0; i < CODE_LENGTH; i++) {
        const index = crypto.randomInt(ALPHANUMERIC_CHARACTERS.length);
        result += ALPHANUMERIC_CHARACTERS[index];
      }
      code = result;
    } while (this.store.hasCode(code));
    return code;
  }

  validateUrl(url: unknown): url is string {
    if (typeof url !== 'string') {
      return false;
    }
    if (url.trim().length === 0) {
      return false;
    }
    return /^https?:\/\//i.test(url);
  }

  createShortUrl(url: string): CreateShortUrlResponse {
    const code = this.generateCode();
    const record: ShortUrlRecord = { code, url, hits: 0 };
    this.store.save(record);
    const shortUrl = `http://localhost:${this.port}/${code}`;
    return { code, shortUrl };
  }

  redirect(code: string): ShortUrlRecord | undefined {
    const record = this.store.incrementHits(code);
    if (!record) {
      return undefined;
    }
    return record;
  }

  getStats(code: string): ShortUrlRecord | undefined {
    return this.store.findByCode(code);
  }
}