import { InMemoryUrlStore } from '../stores/in-memory-url.store';
import { ShortenResponse, StatsResponse, UrlRecord } from '../types/url';

const CODE_LENGTH = 6;
const CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export class UrlShortenerService {
  constructor(private readonly store: InMemoryUrlStore) {}

  isValidUrl(value: unknown): value is string {
    if (typeof value !== 'string') {
      return false;
    }
    return value.startsWith('http://') || value.startsWith('https://');
  }

  private generateCode(): string {
    let code = '';
    for (let i = 0; i < CODE_LENGTH; i++) {
      const randomIndex = Math.floor(Math.random() * CODE_ALPHABET.length);
      code += CODE_ALPHABET[randomIndex];
    }
    return code;
  }

  private generateUniqueCode(): string {
    let code: string;
    do {
      code = this.generateCode();
    } while (this.store.has(code));
    return code;
  }

  private normalizeBaseUrl(baseUrl: string): string {
    return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  }

  createShortUrl(url: string, baseUrl: string): ShortenResponse {
    const normalizedBaseUrl = this.normalizeBaseUrl(baseUrl);
    const code = this.generateUniqueCode();
    const record: UrlRecord = {
      code,
      url,
      hits: 0,
    };
    this.store.set(record);
    return {
      code,
      shortUrl: `${normalizedBaseUrl}/${code}`,
    };
  }

  redirect(code: string): string | undefined {
    const record = this.store.get(code);
    if (!record) {
      return undefined;
    }
    this.store.incrementHits(code);
    return record.url;
  }

  getStats(code: string): StatsResponse | undefined {
    const record = this.store.get(code);
    if (!record) {
      return undefined;
    }
    return {
      code: record.code,
      url: record.url,
      hits: record.hits,
    };
  }
}