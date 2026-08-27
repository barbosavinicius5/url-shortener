import { randomInt } from 'node:crypto';
import type { UrlRecord, UrlStore, ShortenResponse } from '../types/url.js';

const CODE_LENGTH = 6;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function generateCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    const index = randomInt(ALPHABET.length);
    code += ALPHABET[index];
  }
  return code;
}

function generateUniqueCode(store: UrlStore): string {
  let code: string;
  do {
    code = generateCode();
  } while (store.has(code));
  return code;
}

export class UrlShortenerService {
  constructor(
    private readonly store: UrlStore,
    private readonly baseUrl: string,
  ) {}

  createShortUrl(inputUrl: string): ShortenResponse {
    if (!isValidUrl(inputUrl)) {
      throw new ValidationError('Invalid URL: must start with http:// or https:// and be a valid URL');
    }

    const code = generateUniqueCode(this.store);
    const record: UrlRecord = { code, url: inputUrl, hits: 0 };
    this.store.save(record);

    return {
      code,
      shortUrl: `${this.baseUrl}/${code}`,
    };
  }

  getRecord(code: string): UrlRecord | undefined {
    return this.store.get(code);
  }

  getRecordForRedirect(code: string): UrlRecord | undefined {
    const record = this.store.get(code);
    if (record) {
      record.hits += 1;
    }
    return record;
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

function isValidUrl(value: string): boolean {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return false;
  }

  if (!value.startsWith('http://') && !value.startsWith('https://')) {
    return false;
  }

  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}