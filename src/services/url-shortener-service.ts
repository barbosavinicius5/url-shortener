import { randomInt } from 'node:crypto';
import { CreateShortUrlResult, ShortenedUrl, UrlStore } from '../types';

export const CODE_LENGTH = 6;
const CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const MAX_GENERATION_ATTEMPTS = 1000;

export class UrlShortenerService {
  public constructor(private readonly store: UrlStore, private readonly port: number) {}

  public create(value: unknown): CreateShortUrlResult {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new Error('URL must be a non-empty string');
    }
    let parsed: URL;
    try { parsed = new URL(value); } catch { throw new Error('URL is malformed'); }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('URL protocol must be http or https');
    }

    let code = '';
    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
      code = this.generateCode();
      if (!this.store.has(code)) break;
      if (attempt === MAX_GENERATION_ATTEMPTS - 1) throw new Error('Unable to generate a unique short code');
    }
    const entry: ShortenedUrl = { code, url: value, hits: 0 };
    this.store.save(entry);
    return { code, shortUrl: `http://localhost:${this.port}/${code}` };
  }

  public redirect(code: string): ShortenedUrl | undefined { return this.store.incrementHits(code); }
  public getStats(code: string): ShortenedUrl | undefined { return this.store.get(code); }

  private generateCode(): string {
    let code = '';
    for (let index = 0; index < CODE_LENGTH; index += 1) {
      code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
    }
    return code;
  }
}
