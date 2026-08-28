import * as crypto from 'crypto';
import { UrlRecord, CreateShortUrlInput, CreateShortUrlResponse, UrlStatsResponse } from '../types/url';
import { UrlStore } from '../store/url-store';

const CODE_LENGTH = 6;
const ALPHANUMERIC_CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const MAX_GENERATION_ATTEMPTS = 100;

export interface UrlShortenerServiceResult {
  type: 'success' | 'error';
  data?: CreateShortUrlResponse | UrlStatsResponse | UrlRecord;
  error?: string;
}

export class UrlShortenerService {
  constructor(
    private readonly store: UrlStore,
    private readonly port: number
  ) {}

  createShortUrl(input: CreateShortUrlInput): UrlShortenerServiceResult {
    if (typeof input !== 'object' || input === null) {
      return { type: 'error', error: 'Invalid JSON payload' };
    }

    const url = input.url;

    if (typeof url !== 'string') {
      return { type: 'error', error: 'Invalid URL' };
    }

    const trimmedUrl = url.trim();

    if (trimmedUrl.length === 0) {
      return { type: 'error', error: 'Invalid URL' };
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(trimmedUrl);
    } catch {
      return { type: 'error', error: 'Invalid URL' };
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return { type: 'error', error: 'Invalid URL' };
    }

    const code = this.generateUniqueCode();
    if (code === null) {
      return { type: 'error', error: 'Internal error: could not generate unique code' };
    }

    const record: UrlRecord = {
      code,
      originalUrl: trimmedUrl,
      hits: 0,
    };

    this.store.create(record);

    return {
      type: 'success',
      data: {
        code,
        shortUrl: `http://localhost:${this.port}/${code}`,
      },
    };
  }

  redirect(code: string): UrlShortenerServiceResult {
    const record = this.store.findByCode(code);
    if (record === undefined) {
      return { type: 'error', error: 'Short code not found' };
    }

    const updatedRecord = this.store.incrementHits(code);
    if (updatedRecord === undefined) {
      return { type: 'error', error: 'Short code not found' };
    }

    return {
      type: 'success',
      data: {
        code: updatedRecord.code,
        originalUrl: updatedRecord.originalUrl,
        hits: updatedRecord.hits,
      },
    };
  }

  getStats(code: string): UrlShortenerServiceResult {
    const record = this.store.findByCode(code);
    if (record === undefined) {
      return { type: 'error', error: 'Short code not found' };
    }

    return {
      type: 'success',
      data: {
        code: record.code,
        url: record.originalUrl,
        hits: record.hits,
      },
    };
  }

  private generateUniqueCode(): string | null {
    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
      let code = '';
      for (let i = 0; i < CODE_LENGTH; i++) {
        const index = crypto.randomInt(ALPHANUMERIC_CHARACTERS.length);
        code += ALPHANUMERIC_CHARACTERS[index]!;
      }
      if (this.store.findByCode(code) === undefined) {
        return code;
      }
    }
    return null;
  }
}