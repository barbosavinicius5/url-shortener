import { generateCode } from './codeGenerator';
import type { CodeGenerator } from './codeGenerator';
import { validateUrl } from './urlValidator';
import type {
  ShortenResponse,
  StatsResponse,
  UrlRecord,
  UrlStore
} from '../types/url';

const MAX_CODE_GENERATION_ATTEMPTS = 1000;

export type CreateShortUrlResult =
  | { ok: true; data: ShortenResponse }
  | { ok: false; kind: 'invalid-url'; error: string }
  | { ok: false; kind: 'code-generation-failed'; error: string };

export interface UrlService {
  createShortUrl(url: unknown): CreateShortUrlResult;
  redirectToOriginalUrl(code: string): UrlRecord | undefined;
  getStats(code: string): StatsResponse | undefined;
}

export interface UrlServiceOptions {
  /** Base used to build `shortUrl`, e.g. `http://localhost:3000`. */
  baseUrl: string;
  /** Injectable generator, useful for deterministic collision tests. */
  codeGenerator?: CodeGenerator;
}

export function createUrlService(
  store: UrlStore,
  options: UrlServiceOptions
): UrlService {
  const generateCandidate: CodeGenerator = options.codeGenerator ?? generateCode;
  const baseUrl = options.baseUrl.replace(/\/+$/, '');

  const generateUniqueCode = (): string | undefined => {
    for (
      let attempt = 0;
      attempt < MAX_CODE_GENERATION_ATTEMPTS;
      attempt += 1
    ) {
      const candidate = generateCandidate();
      if (store.findByCode(candidate) === undefined) {
        return candidate;
      }
    }
    return undefined;
  };

  return {
    createShortUrl(url: unknown): CreateShortUrlResult {
      const validation = validateUrl(url);
      if (!validation.valid) {
        return { ok: false, kind: 'invalid-url', error: validation.error };
      }

      const code = generateUniqueCode();
      if (code === undefined) {
        return {
          ok: false,
          kind: 'code-generation-failed',
          error: 'Unable to generate a unique short code'
        };
      }

      store.save({ code, url: validation.url, hits: 0 });
      return { ok: true, data: { code, shortUrl: `${baseUrl}/${code}` } };
    },

    redirectToOriginalUrl(code: string): UrlRecord | undefined {
      // incrementHits is a no-op for unknown codes and returns the stored
      // record otherwise, so the counter is never incremented for a code
      // that does not exist.
      return store.incrementHits(code);
    },

    getStats(code: string): StatsResponse | undefined {
      const record = store.findByCode(code);
      if (record === undefined) {
        return undefined;
      }
      return { code: record.code, url: record.url, hits: record.hits };
    }
  };
}