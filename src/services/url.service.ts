import { randomInt } from 'node:crypto';
import { InMemoryUrlStore } from '../store/url.store';
import { ShortenResponse, StatsResponse } from '../types/url';
import { DEFAULT_PORT } from '../config/env';

export const CODE_LENGTH = 6;
export const ALPHANUMERIC_CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const MAX_ATTEMPTS = 1000;

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function defaultCodeGenerator(length: number = CODE_LENGTH): string {
  let result = '';
  const charsLength = ALPHANUMERIC_CHARACTERS.length;
  for (let i = 0; i < length; i++) {
    const index = randomInt(charsLength);
    result += ALPHANUMERIC_CHARACTERS[index];
  }
  return result;
}

export class UrlService {
  constructor(
    private readonly store: InMemoryUrlStore,
    private readonly port: number = DEFAULT_PORT,
    private readonly codeGenerator: () => string = defaultCodeGenerator,
  ) {}

  public shorten(rawUrl: unknown): ShortenResponse {
    if (typeof rawUrl !== 'string' || rawUrl.trim() === '') {
      throw new ValidationError('URL must be a non-empty string');
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(rawUrl);
    } catch {
      throw new ValidationError('Invalid URL format');
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw new ValidationError('URL protocol must be http or https');
    }

    let code = '';
    let attempts = 0;
    do {
      if (attempts >= MAX_ATTEMPTS) {
        throw new Error('Failed to generate a unique short code');
      }
      code = this.codeGenerator();
      attempts++;
    } while (this.store.hasCode(code));

    this.store.create({
      code,
      url: rawUrl,
      hits: 0,
    });

    return {
      code,
      shortUrl: `http://localhost:${this.port}/${code}`,
    };
  }

  public redirect(code: string): { url: string } | null {
    const updated = this.store.incrementHits(code);
    if (!updated) {
      return null;
    }
    return { url: updated.url };
  }

  public getStats(code: string): StatsResponse | null {
    const record = this.store.findByCode(code);
    if (!record) {
      return null;
    }
    return {
      code: record.code,
      url: record.url,
      hits: record.hits,
    };
  }
}