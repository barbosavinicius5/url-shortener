import { randomInt } from 'crypto';
import { UrlRecord } from '../types';
import { UrlStore } from '../store/url.store';
import { CODE_ALPHABET, CODE_LENGTH } from '../config';

/** Thrown when the supplied URL fails validation. */
export class InvalidUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidUrlError';
  }
}

/** Thrown when a code is not present in the store. */
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

/** A pluggable short-code generator (used for deterministic tests). */
export type CodeGenerator = () => string;

/**
 * Domain service for creating short URLs, resolving redirects and reading stats.
 *
 * Stateless apart from the injected `UrlStore`. The code generator is injectable
 * so collisions can be exercised deterministically in tests.
 */
export class UrlShortenerService {
  private readonly store: UrlStore;
  private readonly generate: CodeGenerator;

  constructor(store: UrlStore, generate: CodeGenerator = createCode) {
    this.store = store;
    this.generate = generate;
  }

  /**
   * Generate a code of exactly `CODE_LENGTH` characters that is not already
   * present in the store. Repeats on collision.
   */
  generateUniqueCode(): string {
    let code = this.generate();
    while (this.store.has(code)) {
      code = this.generate();
    }
    return code;
  }

  /**
   * Validate the input, generate a unique code, persist the record and return it.
   * @param rawUrl Value from the HTTP boundary (`unknown`); validated before use.
   */
  createShortUrl(rawUrl: unknown): UrlRecord {
    const url = this.validateUrl(rawUrl);
    const code = this.generateUniqueCode();
    const record: UrlRecord = { code, url, hits: 0 };
    this.store.save(record);
    return record;
  }

  /**
   * Resolve a redirect: increments the hit count exactly once for an existing
   * code and returns the record, or throws `NotFoundError` when absent.
   */
  redirect(code: string): UrlRecord {
    const record = this.store.incrementHits(code);
    if (!record) {
      throw new NotFoundError('Short URL not found');
    }
    return record;
  }

  /**
   * Read statistics for a code without mutating the store. Returns a fresh DTO
   * (never the mutable store object) so callers cannot alter the record.
   * Throws `NotFoundError` when absent.
   */
  getStats(code: string): { code: string; url: string; hits: number } {
    const record = this.store.get(code);
    if (!record) {
      throw new NotFoundError('Short URL not found');
    }
    return { code: record.code, url: record.url, hits: record.hits };
  }

  private validateUrl(raw: unknown): string {
    if (typeof raw !== 'string' || raw.trim() === '') {
      throw new InvalidUrlError('The "url" field must be a non-empty string.');
    }
    let parsed: URL;
    try {
      parsed = new URL(raw);
    } catch {
      throw new InvalidUrlError('The "url" field must be a valid URL.');
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new InvalidUrlError('Only "http:" and "https:" URLs are allowed.');
    }
    // Preserve the original string; no silent normalization.
    return raw;
  }
}

/** Default generator: secure random code using the configured alphabet. */
function createCode(): string {
  let code = '';
  const max = CODE_ALPHABET.length;
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += CODE_ALPHABET.charAt(randomInt(0, max));
  }
  return code;
}