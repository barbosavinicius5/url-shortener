import { randomInt } from 'node:crypto';

import type {
  CreateShortUrlResponse,
  ShortUrlRecord,
  StatsResponse,
  UrlStore,
} from '../types/short-url';

const CODE_LENGTH = 6;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export class InvalidUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidUrlError';
  }
}

export class ShortUrlNotFoundError extends Error {
  constructor(message = 'Short URL not found') {
    super(message);
    this.name = 'ShortUrlNotFoundError';
  }
}

/**
 * Validates the input URL. A valid URL is a non-empty string starting with
 * http:// or https:// (case-insensitive) that is also accepted by the URL parser.
 */
export function validateUrl(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new InvalidUrlError('"url" is required and must be a non-empty string');
  }

  const lowercase = value.toLowerCase();
  if (!lowercase.startsWith('http://') && !lowercase.startsWith('https://')) {
    throw new InvalidUrlError('"url" must start with http:// or https://');
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new InvalidUrlError('"url" is not a valid URL');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new InvalidUrlError('"url" must use the http or https protocol');
  }

  return value;
}

export function generateCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return code;
}

/**
 * Domain service for creating, redirecting and inspecting short URLs.
 * Persistence is delegated to an injected UrlStore.
 */
export class UrlShortenerService {
  constructor(
    private readonly store: UrlStore,
    private readonly baseUrl: string,
  ) {}

  createShortUrl(url: unknown): CreateShortUrlResponse {
    const normalized = validateUrl(url);
    const record = this.buildRecord(normalized);
    this.store.save(record);

    return {
      code: record.code,
      shortUrl: `${this.baseUrl}/${record.code}`,
    };
  }

  redirectTarget(code: string): string {
    const found = this.store.findByCode(code);
    if (!found) {
      throw new ShortUrlNotFoundError();
    }

    // Count the hit exactly once per successful redirect.
    this.store.incrementHits(code);
    return found.url;
  }

  getStats(code: string): StatsResponse {
    const found = this.store.findByCode(code);
    if (!found) {
      throw new ShortUrlNotFoundError();
    }

    // Read-only: stats never increment hits.
    return {
      code: found.code,
      url: found.url,
      hits: found.hits,
    };
  }

  private buildRecord(url: string): ShortUrlRecord {
    let code = generateCode();
    while (this.store.findByCode(code)) {
      code = generateCode();
    }

    return { code, url, hits: 0 };
  }
}