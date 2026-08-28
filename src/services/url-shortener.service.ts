import { randomInt } from 'crypto';
import { InMemoryUrlStore } from '../stores/in-memory-url.store';
import { ShortenResponse, StatsResponse } from '../types/url';

const CODE_LENGTH = 6;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export class UrlValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UrlValidationError';
  }
}

export type CodeGenerator = (length: number) => string;

export function generateCode(length: number): string {
  let result = '';
  for (let i = 0; i < length; i += 1) {
    result += ALPHABET[randomInt(ALPHABET.length)];
  }
  return result;
}

export class UrlShortenerService {
  constructor(
    private readonly store: InMemoryUrlStore,
    private readonly port: number,
    private readonly codeGenerator: CodeGenerator = generateCode,
  ) {}

  createShortUrl(input: unknown): ShortenResponse {
    const url = this.validateUrl(input);

    let code = this.codeGenerator(CODE_LENGTH);
    while (this.store.findByCode(code)) {
      code = this.codeGenerator(CODE_LENGTH);
    }

    this.store.save({ code, url, hits: 0 });

    return { code, shortUrl: this.buildShortUrl(code) };
  }

  getRedirect(code: string): { url: string } | undefined {
    const record = this.store.incrementHits(code);
    if (!record) {
      return undefined;
    }
    return { url: record.url };
  }

  getStats(code: string): StatsResponse | undefined {
    const record = this.store.findByCode(code);
    if (!record) {
      return undefined;
    }
    return { code: record.code, url: record.url, hits: record.hits };
  }

  private validateUrl(input: unknown): string {
    if (typeof input !== 'string') {
      throw new UrlValidationError('URL is required');
    }

    const value = input.trim();
    if (value.length === 0) {
      throw new UrlValidationError('URL is required');
    }

    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      throw new UrlValidationError('Invalid URL');
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new UrlValidationError('URL must start with http:// or https://');
    }

    return value;
  }

  private buildShortUrl(code: string): string {
    return `http://localhost:${this.port}/${code}`;
  }
}