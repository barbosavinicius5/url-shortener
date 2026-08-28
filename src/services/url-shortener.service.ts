import type { UrlStore } from '../store/url.store.js';
import type {
  AppConfig,
  CreateShortUrlResponse,
  ShortUrlRecord,
  StatsResponse,
} from '../types/url.js';
import { generateCode } from './url-code.generator.js';

/** Function responsible for producing a candidate short code. */
export type CodeGenerator = () => string;

const defaultCodeGenerator: CodeGenerator = () => generateCode();

/** Successful outcome of {@linkcode UrlShortenerService.createShortUrl}. */
export type CreateShortUrlResult =
  | { ok: true; response: CreateShortUrlResponse }
  | { ok: false; error: string };

/** Defensive upper bound for code-generation retries in case of collisions. */
const MAX_CODE_ATTEMPTS = 1_000;

/**
 * Domain service: validates input URLs, generates unique codes, keeps records
 * in the store and assembles responses. It never touches `Request`/`Response`.
 */
export class UrlShortenerService {
  private readonly store: UrlStore;
  private readonly config: AppConfig;
  private readonly generateCode: CodeGenerator;

  constructor(
    store: UrlStore,
    config: AppConfig,
    generateCode: CodeGenerator = defaultCodeGenerator,
  ) {
    this.store = store;
    this.config = config;
    this.generateCode = generateCode;
  }

  /** Creation flow: validate -> generate a unique code -> store -> respond. */
  createShortUrl(rawUrl: unknown): CreateShortUrlResult {
    const url = validateAndNormalizeUrl(rawUrl);
    if (url === undefined) {
      return { ok: false, error: 'A valid http:// or https:// URL is required.' };
    }

    const code = this.generateUniqueCode();
    this.store.create({ code, url, hits: 0 });

    return {
      ok: true,
      response: {
        code,
        shortUrl: `${this.config.baseUrl}/${code}`,
      },
    };
  }

  /** Returns the record for a code without counting a redirect hit. */
  getRecord(code: string): ShortUrlRecord | undefined {
    return this.store.get(code);
  }

  /**
   * Redirect flow: finds the record for `code` and counts exactly one hit.
   * Returns `undefined` when the code does not exist (no hit is counted).
   */
  resolveForRedirect(code: string): ShortUrlRecord | undefined {
    const record = this.store.get(code);
    if (record === undefined) {
      return undefined;
    }

    this.store.incrementHits(code);
    return record;
  }

  /** Stats flow: read-only view of the record; never mutates `hits`. */
  getStats(code: string): StatsResponse | undefined {
    const record = this.store.get(code);
    if (record === undefined) {
      return undefined;
    }

    return { code: record.code, url: record.url, hits: record.hits };
  }

  private generateUniqueCode(): string {
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
      const code = this.generateCode();
      if (!this.store.has(code)) {
        return code;
      }
    }

    throw new Error(
      `Could not generate a unique short code after ${MAX_CODE_ATTEMPTS} attempts.`,
    );
  }
}

/**
 * Validates an untrusted value as an `http://` or `https://` URL.
 * Returns the trimmed value to store, or `undefined` when invalid.
 */
function validateAndNormalizeUrl(rawUrl: unknown): string | undefined {
  if (typeof rawUrl !== 'string') {
    return undefined;
  }

  const trimmed = rawUrl.trim();
  if (trimmed === '') {
    return undefined;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return undefined;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return undefined;
  }

  return trimmed;
}