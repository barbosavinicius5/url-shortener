import { randomInt } from 'node:crypto';
import { DEFAULT_PORT } from '../config.js';
import { UrlStore } from '../store/url-store.js';
import { CreateShortUrlResponse, StatsResponse, UrlRecord } from '../types/url.js';

export const CODE_LENGTH = 6;

/** Alphabet used for generated codes: exactly [A-Za-z0-9]. */
export const ALPHANUMERIC_CHARACTERS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/** Raised when the requested URL does not satisfy the product validation rule. */
export class InvalidUrlError extends Error {
  constructor(
    message = 'Invalid URL: "url" must be a non-empty string starting with http:// or https://.',
  ) {
    super(message);
    this.name = 'InvalidUrlError';
  }
}

/**
 * Product validation is deliberately prefix-based (case-sensitive): a URL is
 * valid when, after trimming, it is non-empty and starts with `http://` or
 * `https://`. This is intentionally not replaced by a stricter `new URL()` check.
 */
export function isValidUrl(url: unknown): url is string {
  if (typeof url !== 'string') {
    return false;
  }
  const trimmed = url.trim();
  return (
    trimmed.length > 0 &&
    (trimmed.startsWith('http://') || trimmed.startsWith('https://'))
  );
}

/**
 * Coordinates creation, code generation, lookups and hit counting.
 * All mutations go through the store; lookups return defensive copies.
 */
export class UrlShortenerService {
  private readonly store: UrlStore;
  private readonly baseUrl: string;

  constructor(
    store: UrlStore = new UrlStore(),
    baseUrl: string = `http://localhost:${DEFAULT_PORT}`,
  ) {
    this.store = store;
    this.baseUrl = baseUrl;
  }

  /**
   * Creates a new short URL for `url`.
   * No deduplication: sending the same URL again produces a new record.
   */
  createShortUrl(url: unknown): CreateShortUrlResponse {
    if (!isValidUrl(url)) {
      throw new InvalidUrlError();
    }
    const normalizedUrl = url.trim();
    const code = this.generateUniqueCode();
    const record: UrlRecord = { code, url: normalizedUrl, hits: 0 };
    this.store.save(record);
    return { code, shortUrl: `${this.baseUrl}/${code}` };
  }

  /**
   * Resolves a code to its original URL and counts exactly one hit.
   * Returns `undefined` when the code does not exist.
   */
  redirect(code: string): string | undefined {
    const record = this.store.findByCode(code);
    if (!record) {
      return undefined;
    }
    this.store.incrementHits(code);
    return record.url;
  }

  /** Read-only stats lookup: never mutates hit counters. */
  getStats(code: string): StatsResponse | undefined {
    const record = this.store.findByCode(code);
    if (!record) {
      return undefined;
    }
    return { code: record.code, url: record.url, hits: record.hits };
  }

  /** Generates a random code that is unique against the store (same Map is the source of truth). */
  private generateUniqueCode(): string {
    let code = this.generateCode();
    while (this.store.has(code)) {
      code = this.generateCode();
    }
    return code;
  }

  private generateCode(): string {
    let code = '';
    for (let i = 0; i < CODE_LENGTH; i += 1) {
      code += ALPHANUMERIC_CHARACTERS[randomInt(ALPHANUMERIC_CHARACTERS.length)];
    }
    return code;
  }
}