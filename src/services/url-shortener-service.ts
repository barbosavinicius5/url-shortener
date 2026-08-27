import { randomBytes } from 'node:crypto';
import type { ShortUrlRecord } from '../types/short-url.js';
import type { UrlStore } from '../store/in-memory-url-store.js';

export const CODE_LENGTH = 6;
export const ALPHANUMERIC_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function generateCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHANUMERIC_ALPHABET[bytes[i]! % ALPHANUMERIC_ALPHABET.length]!;
  }
  return code;
}

export class UrlShortenerService {
  private store: UrlStore;
  private port: number;

  constructor(store: UrlStore, port: number = 3000) {
    this.store = store;
    this.port = port;
  }

  getPort(): number {
    return this.port;
  }

  shorten(url: string): ShortUrlRecord {
    let code = generateCode();
    while (this.store.findByCode(code)) {
      code = generateCode();
    }

    const record: ShortUrlRecord = { code, url, hits: 0 };
    this.store.save(record);
    return record;
  }

  getShortUrl(code: string): string {
    return `http://localhost:${this.port}/${code}`;
  }

  redirect(code: string): ShortUrlRecord | undefined {
    return this.store.incrementHits(code);
  }

  getStats(code: string): ShortUrlRecord | undefined {
    return this.store.findByCode(code);
  }

  validateUrl(url: unknown): { valid: true; url: string } | { valid: false; error: string } {
    if (url === undefined || url === null) {
      return { valid: false, error: 'URL is required' };
    }

    if (typeof url !== 'string') {
      return { valid: false, error: 'URL must be a string' };
    }

    const trimmed = url.trim();
    if (trimmed === '') {
      return { valid: false, error: 'URL is required' };
    }

    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      return { valid: false, error: 'URL is malformed' };
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, error: 'Only http and https protocols are allowed' };
    }

    return { valid: true, url: trimmed };
  }
}