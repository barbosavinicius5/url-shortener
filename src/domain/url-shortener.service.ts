import { randomInt } from 'node:crypto';
import { CreateShortUrlResult, UrlRecord } from './types';
import { UrlStore } from '../store/url.store';

export const CODE_LENGTH = 6;
export const ALPHANUMERIC_CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export class InvalidUrlError extends Error {
  constructor() {
    super('URL must be a valid HTTP or HTTPS URL');
    this.name = 'InvalidUrlError';
  }
}

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
  constructor(private readonly store: UrlStore, private readonly publicBaseUrl: string) {}

  create(url: unknown): CreateShortUrlResult {
    if (!isValidHttpUrl(url)) throw new InvalidUrlError();
    let code: string;
    do {
      code = Array.from({ length: CODE_LENGTH }, () =>
        ALPHANUMERIC_CHARACTERS[randomInt(ALPHANUMERIC_CHARACTERS.length)],
      ).join('');
    } while (this.store.find(code));
    const record: UrlRecord = { code, url, hits: 0 };
    this.store.save(record);
    return { code, shortUrl: `${this.publicBaseUrl}/${code}` };
  }

  resolveAndCount(code: string): UrlRecord | undefined {
    const record = this.store.find(code);
    if (!record) return undefined;
    record.hits += 1;
    return record;
  }

  getStats(code: string): UrlRecord | undefined {
    const record = this.store.find(code);
    return record ? { code: record.code, url: record.url, hits: record.hits } : undefined;
  }
}