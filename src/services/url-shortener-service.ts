import type { ShortenResponse, StatsResponse, UrlRecord } from '../types/url.js';
import { UrlStore } from '../store/url-store.js';

export const CODE_LENGTH = 6;
const CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export type CodeGenerator = () => string;

export class InvalidUrlError extends Error {
  constructor() {
    super('url must be a non-empty HTTP or HTTPS URL');
    this.name = 'InvalidUrlError';
  }
}

function defaultCodeGenerator(): string {
  let code = '';
  for (let index = 0; index < CODE_LENGTH; index += 1) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

export class UrlShortenerService {
  constructor(
    private readonly store: UrlStore,
    private readonly codeGenerator: CodeGenerator = defaultCodeGenerator,
  ) {}

  createShortUrl(url: unknown): ShortenResponse & { record: UrlRecord } {
    if (typeof url !== 'string' || url.trim().length === 0 || !/^https?:\/\//i.test(url.trim())) {
      throw new InvalidUrlError();
    }

    let code = this.codeGenerator();
    while (this.store.findByCode(code)) code = this.codeGenerator();
    const record: UrlRecord = { code, url, hits: 0 };
    this.store.save(record);
    return { code, shortUrl: '', record };
  }

  redirect(code: string): UrlRecord | undefined {
    return this.store.incrementHits(code);
  }

  getStats(code: string): StatsResponse | undefined {
    const record = this.store.findByCode(code);
    return record ? { code: record.code, url: record.url, hits: record.hits } : undefined;
  }
}