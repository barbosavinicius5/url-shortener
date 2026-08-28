import { randomBytes } from 'node:crypto';
import { UrlStore } from '../stores/urlStore';
import {
  CreateShortUrlResult,
  InvalidUrlError,
  ShortUrlRecord,
  UrlStats,
} from '../types/url';

const CODE_LENGTH = 6;
const ALPHANUMERIC_CHARACTERS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/**
 * Business logic for shortening URLs, validating input, generating unique
 * short codes and accounting for redirection hits.
 */
export class UrlShortenerService {
  private readonly store: UrlStore;

  constructor(store: UrlStore) {
    this.store = store;
  }

  createShortUrl(url: unknown, port: number): CreateShortUrlResult {
    const normalized = this.validateUrl(url);
    const code = this.generateUniqueCode();
    const record: ShortUrlRecord = { code, url: normalized, hits: 0 };
    this.store.save(record);
    const shortUrl = `http://localhost:${port}/${code}`;
    return { code, shortUrl };
  }

  /**
   * Looks up a record and increments its hit counter exactly once for each
   * successful call. Returns `undefined` for an unknown code.
   */
  getAndRecordHit(code: string): ShortUrlRecord | undefined {
    return this.store.incrementHits(code);
  }

  /**
   * Returns only `{ code, url, hits }` for an existing record. It never mutates
   * the stored record.
   */
  getStats(code: string): UrlStats | undefined {
    const record = this.store.findByCode(code);
    if (!record) {
      return undefined;
    }
    return { code: record.code, url: record.url, hits: record.hits };
  }

  private validateUrl(url: unknown): string {
    if (typeof url !== 'string') {
      throw new InvalidUrlError('url must be a non-empty string');
    }
    const trimmed = url.trim();
    if (trimmed.length === 0) {
      throw new InvalidUrlError('url must not be empty');
    }
    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      throw new InvalidUrlError('url is not a valid URL');
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new InvalidUrlError('url must use http or https protocol');
    }
    return trimmed;
  }

  private generateUniqueCode(): string {
    let candidate = this.generateCode();
    while (this.store.exists(candidate)) {
      candidate = this.generateCode();
    }
    return candidate;
  }

  /**
   * Generates exactly CODE_LENGTH characters drawn from A-Z, a-z and 0-9 using
   * a cryptographically-strong random source. A rejection-sampling step keeps
   * the distribution uniform (bytes >= 248 are discarded because 248 is a
   * multiple of the alphabet length 62).
   */
  private generateCode(): string {
    let result = '';
    while (result.length < CODE_LENGTH) {
      const byte = randomBytes(1)[0];
      const limit = ALPHANUMERIC_CHARACTERS.length * 4; // 248
      if (byte < limit) {
        result += ALPHANUMERIC_CHARACTERS[byte % ALPHANUMERIC_CHARACTERS.length];
      }
    }
    return result;
  }
}