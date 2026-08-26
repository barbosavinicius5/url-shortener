import { InMemoryUrlStore } from '../store/in-memory-url.store';
import { ShortUrlResponse, UrlShortenerRecord } from '../types/url-shortener';

export const CODE_LENGTH = 6;
export const CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export class UrlShortenerService {
  constructor(private readonly store: InMemoryUrlStore) {}

  isValidUrl(value: unknown): value is string {
    if (typeof value !== 'string' || value.length === 0) return false;
    try {
      const parsed = new URL(value);
      return (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
        /^(https?):\/\//.test(value);
    } catch {
      return false;
    }
  }

  create(url: unknown, port: number): ShortUrlResponse {
    if (!this.isValidUrl(url)) throw new Error('URL must be a valid HTTP or HTTPS address');
    const code = this.generateUniqueCode();
    this.store.save({ code, url, hits: 0 });
    return { code, shortUrl: `http://localhost:${port}/${code}` };
  }

  find(code: string): UrlShortenerRecord | undefined {
    return this.store.findByCode(code);
  }

  redirect(code: string): UrlShortenerRecord | undefined {
    return this.store.incrementHits(code);
  }

  stats(code: string): UrlShortenerRecord | undefined {
    return this.store.findByCode(code);
  }

  private generateUniqueCode(): string {
    let code = '';
    do {
      code = Array.from({ length: CODE_LENGTH }, () =>
        CODE_ALPHABET.charAt(Math.floor(Math.random() * CODE_ALPHABET.length))
      ).join('');
    } while (this.store.findByCode(code));
    return code;
  }
}