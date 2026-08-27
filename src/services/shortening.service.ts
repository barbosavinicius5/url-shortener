import { randomInt } from 'node:crypto';
import { InMemoryUrlStore } from '../store/in-memory-url.store';
import {
  CreateShorteningInput,
  CreateShorteningResponse,
  StatsResponse,
  UrlRecord,
} from '../types/url.types';

export const CODE_LENGTH = 6;
export const ALPHANUMERIC_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export class ShorteningService {
  constructor(private readonly store: InMemoryUrlStore) {}

  create(input: CreateShorteningInput, port: number): CreateShorteningResponse {
    if (!this.isValidUrl(input.url)) {
      throw new Error('A valid HTTP or HTTPS URL is required');
    }
    const code = this.generateUniqueCode();
    this.store.create({ code, url: input.url, hits: 0 });
    return { code, shortUrl: `http://localhost:${port}/${code}` };
  }

  findByCode(code: string): UrlRecord | undefined {
    return this.store.findByCode(code);
  }

  incrementHits(code: string): UrlRecord | undefined {
    return this.store.incrementHits(code);
  }

  getStats(code: string): StatsResponse | undefined {
    const record = this.store.findByCode(code);
    return record ? { code: record.code, url: record.url, hits: record.hits } : undefined;
  }

  isValidUrl(value: unknown): value is string {
    if (typeof value !== 'string' || value.trim() === '') return false;
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  generateUniqueCode(): string {
    let code: string;
    do {
      code = Array.from({ length: CODE_LENGTH }, () =>
        ALPHANUMERIC_CHARS[randomInt(ALPHANUMERIC_CHARS.length)],
      ).join('');
    } while (this.store.findByCode(code));
    return code;
  }
}
