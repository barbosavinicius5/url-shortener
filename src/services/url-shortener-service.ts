import { randomInt } from 'crypto';
import { ShortUrlRecord } from '../types';
import { UrlStore } from '../store/url-store';
import { buildShortUrl, getPort } from '../config';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const CODE_LENGTH = 6;

function generateCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    const index = randomInt(0, ALPHABET.length);
    code += ALPHABET[index];
  }
  return code;
}

export class UrlShortenerService {
  constructor(private readonly store: UrlStore) {}

  validateUrl(value: unknown): string | null {
    if (typeof value !== 'string' || value.trim() === '') {
      return null;
    }
    try {
      const url = new URL(value);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return null;
      }
      return value;
    } catch {
      return null;
    }
  }

  createShortUrl(url: string): ShortUrlRecord {
    let code: string;
    do {
      code = generateCode();
    } while (this.store.findByCode(code) !== undefined);

    const record: ShortUrlRecord = { code, url, hits: 0 };
    this.store.create(record);
    return record;
  }

  redirect(code: string): ShortUrlRecord | undefined {
    return this.store.incrementHits(code);
  }

  getStats(code: string): ShortUrlRecord | undefined {
    return this.store.findByCode(code);
  }
}