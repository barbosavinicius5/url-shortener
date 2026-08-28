import { randomInt } from 'node:crypto';
import { getShortUrlBase } from '../config/environment';
import { CreateShortUrlResponse, ShortUrlStats } from '../models/url-shortener';
import { UrlStore } from '../storage/url-store';

export class InvalidUrlError extends Error {
  constructor() {
    super('A valid http:// or https:// URL is required');
    this.name = 'InvalidUrlError';
  }
}

const CODE_LENGTH = 6;
const CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export function isValidHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.trim() === '') return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export class UrlShortenerService {
  private readonly baseUrl: string;

  constructor(private readonly store: UrlStore, port: number) {
    this.baseUrl = getShortUrlBase(port);
  }

  createShortUrl(url: unknown): CreateShortUrlResponse {
    if (!isValidHttpUrl(url)) throw new InvalidUrlError();
    const code = this.generateUniqueCode();
    this.store.save({ code, url, hits: 0 });
    return { code, shortUrl: `${this.baseUrl}/${code}` };
  }

  redirect(code: string): string | undefined {
    return this.store.incrementHits(code)?.url;
  }

  getStats(code: string): ShortUrlStats | undefined {
    const record = this.store.findByCode(code);
    if (!record) return undefined;
    return { code: record.code, url: record.url, hits: record.hits };
  }

  private generateUniqueCode(): string {
    let code = '';
    do {
      code = Array.from({ length: CODE_LENGTH }, () =>
        CODE_ALPHABET[randomInt(CODE_ALPHABET.length)] ?? '',
      ).join('');
    } while (this.store.findByCode(code));
    return code;
  }
}