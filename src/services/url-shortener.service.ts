import { InMemoryUrlStore } from '../storage/in-memory-url.store';
import {
  ShortenResponse,
  StatsResponse,
  UrlRecord
} from '../types/url.types';

const CODE_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const CODE_LENGTH = 6;
const MAX_GENERATION_ATTEMPTS = 100;

/** Body is not a usable JSON object. */
export class InvalidBodyError extends Error {}

/** `url` is missing, not a string, malformed or not http(s). */
export class InvalidUrlError extends Error {}

/** The requested short code does not exist. */
export class NotFoundError extends Error {}

/** Could not find a free code within the defensive attempt limit. */
export class CodeGenerationError extends Error {}

/**
 * Business rules for shortening URLs: validation, code generation,
 * shortUrl composition, lookup with hit counting and stats.
 */
export class UrlShortenerService {
  constructor(
    private readonly store: InMemoryUrlStore,
    private readonly baseUrl: string
  ) {}

  /** Validates the payload and creates a new short URL. */
  shorten(payload: unknown): ShortenResponse {
    const url = this.validatePayload(payload);
    const code = this.generateUniqueCode();

    const record: UrlRecord = { code, url, hits: 0 };
    this.store.save(record);

    return { code, shortUrl: `${this.baseUrl}/${code}` };
  }

  /** Resolves a code for redirection, incrementing hits exactly once. */
  redirect(code: string): UrlRecord {
    const record = this.store.incrementHits(code);

    if (!record) {
      throw new NotFoundError('Short URL not found');
    }

    return record;
  }

  /** Reads stats for a code without changing anything. */
  getStats(code: string): StatsResponse {
    const record = this.store.findByCode(code);

    if (!record) {
      throw new NotFoundError('Short URL not found');
    }

    return { code: record.code, url: record.url, hits: record.hits };
  }

  private validatePayload(payload: unknown): string {
    if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new InvalidBodyError('Request body must be a JSON object');
    }

    const url = (payload as { url?: unknown }).url;

    if (typeof url !== 'string' || url.trim() === '') {
      throw new InvalidUrlError(
        'Field "url" is required and must be a non-empty string'
      );
    }

    let parsed: URL;

    try {
      parsed = new URL(url);
    } catch {
      throw new InvalidUrlError('Field "url" must be a valid URL');
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new InvalidUrlError(
        'Field "url" must use the http:// or https:// scheme'
      );
    }

    return url;
  }

  private generateUniqueCode(): string {
    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
      const code = this.generateCode();

      if (this.store.findByCode(code) === undefined) {
        return code;
      }
    }

    throw new CodeGenerationError('Unable to generate a unique short code');
  }

  private generateCode(): string {
    let code = '';

    for (let position = 0; position < CODE_LENGTH; position++) {
      const index = Math.floor(Math.random() * CODE_ALPHABET.length);
      code += CODE_ALPHABET[index];
    }

    return code;
  }
}