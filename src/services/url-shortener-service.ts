import { randomInt } from 'crypto';
import { CODE_ALPHABET, CODE_LENGTH, UrlStore } from '../types';

export class UrlShortenerService {
  constructor(private readonly store: UrlStore) {}

  shorten(url: string): { code: string; shortUrl: string; base: string } {
    // isSupportedUrl is called by the route before reaching here,
    // but we also validate defensively
    if (!isSupportedUrl(url)) {
      throw new Error('Unsupported URL');
    }
    const code = generateCode(this.store);
    const base = ''; // base is set externally via shortUrlBase
    this.store.create({ code, url, hits: 0 });
    return { code, shortUrl: '', base };
  }

  getRedirectTarget(code: string): { url: string } | undefined {
    const record = this.store.findByCode(code);
    if (!record) {
      return undefined;
    }
    // increment happens in route after redirect to keep it clean
    return { url: record.url };
  }

  getStats(code: string): { code: string; url: string; hits: number } | undefined {
    const record = this.store.findByCode(code);
    if (!record) {
      return undefined;
    }
    return { code: record.code, url: record.url, hits: record.hits };
  }

  incrementHits(code: string): boolean {
    const result = this.store.incrementHits(code);
    return result !== undefined;
  }
}

export function isSupportedUrl(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }
  return value.startsWith('http://') || value.startsWith('https://');
}

export function generateCode(store: UrlStore): string {
  let code: string;
  do {
    code = '';
    for (let i = 0; i < CODE_LENGTH; i++) {
      code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
    }
  } while (store.findByCode(code) !== undefined);
  return code;
}