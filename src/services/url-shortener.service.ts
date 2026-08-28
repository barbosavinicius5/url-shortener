import { randomInt } from 'node:crypto';

import { InMemoryUrlStore } from '../stores/in-memory-url.store';
import type {
  ShortenResponse,
  StatsResponse,
  UrlRecord,
} from '../types/url';

/** Explicit alphanumeric alphabet used to build short codes. */
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const CODE_LENGTH = 6;
const MAX_GENERATION_ATTEMPTS = 100;

/** Domain error thrown for an invalid URL payload (mapped to HTTP 400). */
export class InvalidUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidUrlError';
  }
}

/**
 * Core business logic for the URL shortener: validation, short-code generation,
 * record creation and hit counting. Stateless apart from the injected store.
 */
export class UrlShortenerService {
  constructor(
    private readonly store: InMemoryUrlStore,
    private readonly randomIndex: (max: number) => number = (max: number) =>
      randomInt(0, max),
  ) {}

  /**
   * Validates and persists a new short URL.
   * @param url The raw `url` field from the request body (validated here).
   * @param baseUrl Public base (scheme + host[:port]) used to build `shortUrl`.
   * @returns The generated code and the composed `shortUrl`.
   * @throws InvalidUrlError when the URL is missing or not a valid http/https URL.
   */
  create(url: unknown, baseUrl: string): ShortenResponse {
    const normalizedUrl = this.validateUrl(url);

    let code = this.generateCode();
    let attempts = 0;
    while (this.store.hasCode(code)) {
      attempts += 1;
      if (attempts > MAX_GENERATION_ATTEMPTS) {
        throw new Error(
          'Unable to generate a unique short code: the code space is exhausted.',
        );
      }
      code = this.generateCode();
    }

    const record = this.store.create(normalizedUrl, code);
    return { code: record.code, shortUrl: `${baseUrl}/${record.code}` };
  }

  /**
   * Resolves a code for redirection, incrementing its hit counter exactly once
   * when the code exists. Returns `undefined` for unknown codes.
   */
  redirect(code: string): UrlRecord | undefined {
    return this.store.incrementHits(code);
  }

  /**
   * Returns statistics for a code without mutating it. Returns `undefined` for
   * unknown codes.
   */
  getStats(code: string): StatsResponse | undefined {
    const record = this.store.findByCode(code);
    if (!record) {
      return undefined;
    }
    return { code: record.code, url: record.url, hits: record.hits };
  }

  private validateUrl(url: unknown): string {
    if (typeof url !== 'string') {
      throw new InvalidUrlError('Field "url" is required and must be a string.');
    }

    const trimmed = url.trim();
    if (trimmed.length === 0) {
      throw new InvalidUrlError('Field "url" must not be empty.');
    }

    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      throw new InvalidUrlError('Field "url" must be a valid URL.');
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new InvalidUrlError(
        'Field "url" must use the http or https protocol.',
      );
    }

    return trimmed;
  }

  private generateCode(): string {
    let code = '';
    for (let i = 0; i < CODE_LENGTH; i += 1) {
      code += ALPHABET[this.randomIndex(ALPHABET.length)];
    }
    return code;
  }
}