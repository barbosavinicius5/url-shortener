import { randomInt } from 'crypto';
import { UrlRecord, UrlStore, AppConfig } from '../types/url';

const CODE_LENGTH = 6;
const ALPHANUMERIC_CHARACTERS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const MAX_COLLISION_ATTEMPTS = 100_000;

function generateCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    const index = randomInt(0, ALPHANUMERIC_CHARACTERS.length);
    code += ALPHANUMERIC_CHARACTERS[index];
  }
  return code;
}

export class UrlShortenerService {
  constructor(
    private readonly store: UrlStore,
    private readonly config: AppConfig,
  ) {}

  shortenUrl(url: string): { code: string; shortUrl: string } {
    const parsed = this.parseAndValidateUrl(url);

    let code = generateCode();
    let attempts = 0;
    while (this.store.findByCode(code) !== undefined) {
      code = generateCode();
      attempts++;
      if (attempts >= MAX_COLLISION_ATTEMPTS) {
        throw new Error('Unable to generate a unique code after maximum attempts');
      }
    }

    const baseUrl = this.config.baseUrl ?? `http://localhost:${this.config.port}`;
    const shortUrl = `${baseUrl}/${code}`;

    const record: UrlRecord = {
      code,
      url: parsed.href,
      hits: 0,
    };

    this.store.create(record);

    return { code, shortUrl };
  }

  resolveCode(code: string): { record: UrlRecord } | null {
    const record = this.store.findByCode(code);
    if (!record) return null;

    const updatedRecord = this.store.incrementHits(code);
    return { record: updatedRecord ?? record };
  }

  getStats(code: string): UrlRecord | null {
    const record = this.store.findByCode(code);
    return record ?? null;
  }

  private parseAndValidateUrl(value: unknown): URL {
    if (typeof value !== 'string') {
      throw new UrlValidationError('URL must be a string');
    }

    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new UrlValidationError('URL must not be empty');
    }

    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      throw new UrlValidationError('Invalid URL format');
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new UrlValidationError(
        'Only http:// and https:// URLs are allowed',
      );
    }

    return parsed;
  }
}

export class UrlValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UrlValidationError';
  }
}