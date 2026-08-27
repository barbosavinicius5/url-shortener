import { randomInt } from 'node:crypto';
import type { CreateShortUrlInput, CreateShortUrlResult, ShortUrlStats } from '../types/url';
import type { UrlStore } from '../stores/in-memory-url.store';

export class InvalidUrlError extends Error {
  constructor() { super('A valid http or https URL is required'); this.name = 'InvalidUrlError'; }
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const CODE_LENGTH = 6;

export class UrlShortenerService {
  constructor(private readonly store: UrlStore, private readonly baseUrl: string) {}

  create(input: CreateShortUrlInput): CreateShortUrlResult {
    if (!isValidUrl(input.url)) throw new InvalidUrlError();
    const code = this.generateUniqueCode();
    this.store.save({ code, url: input.url, hits: 0 });
    return { code, shortUrl: `${this.baseUrl}/${code}` };
  }

  getAndCount(code: string) {
    const record = this.store.findByCode(code);
    return record ? this.store.incrementHits(code) : undefined;
  }

  getStats(code: string): ShortUrlStats | undefined {
    const record = this.store.findByCode(code);
    return record ? { code: record.code, url: record.url, hits: record.hits } : undefined;
  }

  private generateUniqueCode(): string {
    let code: string;
    do {
      code = Array.from({ length: CODE_LENGTH }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
    } while (this.store.findByCode(code));
    return code;
  }
}

function isValidUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const parsed = new URL(value);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.hostname.length > 0;
  } catch { return false; }
}