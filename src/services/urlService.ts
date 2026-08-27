import crypto from 'node:crypto';
import type { UrlRecord, CreateShortUrlResult, UrlStats, UrlStore } from '../types/url.js';
import { getBaseUrl } from '../config.js';

const CODE_LENGTH = 6;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const MAX_GENERATION_ATTEMPTS = 100;

export class UrlService {
  private store: UrlStore;
  private baseUrl: string;

  constructor(store: UrlStore, baseUrl: string) {
    this.store = store;
    this.baseUrl = baseUrl;
  }

  private generateCode(): string {
    let code = '';
    for (let i = 0; i < CODE_LENGTH; i++) {
      const index = crypto.randomInt(0, ALPHABET.length);
      code += ALPHABET[index];
    }
    return code;
  }

  private uniqueCode(): string {
    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
      const code = this.generateCode();
      if (!this.store.findByCode(code)) {
        return code;
      }
    }
    throw new Error('Failed to generate unique short code');
  }

  validateUrl(url: unknown): string | null {
    if (typeof url !== 'string' || url.trim() === '') {
      return 'URL is required';
    }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return 'URL must start with http:// or https://';
    }
    try {
      new URL(url);
    } catch {
      return 'Invalid URL';
    }
    return null;
  }

  createShortUrl(url: string): CreateShortUrlResult {
    const code = this.uniqueCode();
    const record: UrlRecord = { code, url, hits: 0 };
    this.store.save(record);
    return { code, shortUrl: `${this.baseUrl}/${code}` };
  }

  redirect(code: string): UrlRecord | undefined {
    const record = this.store.findByCode(code);
    if (!record) {
      return undefined;
    }
    return this.store.incrementHits(code);
  }

  getStats(code: string): UrlStats | undefined {
    const record = this.store.findByCode(code);
    if (!record) {
      return undefined;
    }
    return { code: record.code, url: record.url, hits: record.hits };
  }
}