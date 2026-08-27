import { randomInt } from 'node:crypto';
import type { UrlRecord, CreateShortUrlResponse, UrlStatsResponse, UrlErrorResponse } from '../types/url.js';
import type { UrlStore } from '../store/url.store.js';

const CODE_LENGTH = 6;
const CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const ALPHABET_LENGTH = CODE_ALPHABET.length;
const VALID_PROTOCOLS = ['http:', 'https:'];

export interface CodeGenerator {
  generate(): string;
}

export class RandomCodeGenerator implements CodeGenerator {
  generate(): string {
    let code = '';
    for (let i = 0; i < CODE_LENGTH; i++) {
      code += CODE_ALPHABET[randomInt(ALPHABET_LENGTH)];
    }
    return code;
  }
}

function generateUniqueCode(store: UrlStore, generator: CodeGenerator): string {
  let code: string;
  let attempts = 0;
  do {
    code = generator.generate();
    attempts++;
    if (attempts > 100) {
      throw new Error('Unable to generate a unique code after 100 attempts');
    }
  } while (store.findByCode(code) !== undefined);
  return code;
}

export class UrlShortenerService {
  constructor(
    private readonly store: UrlStore,
    private readonly codeGenerator: CodeGenerator = new RandomCodeGenerator(),
  ) {}

  validateUrl(url: unknown): UrlErrorResponse | null {
    if (typeof url !== 'string' || url.trim().length === 0) {
      return { error: 'Invalid URL' };
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return { error: 'Invalid URL' };
    }

    if (!VALID_PROTOCOLS.includes(parsed.protocol)) {
      return { error: 'Invalid URL' };
    }

    return null;
  }

  createShortUrl(url: string, baseUrl: string): CreateShortUrlResponse {
    const code = generateUniqueCode(this.store, this.codeGenerator);
    const record: UrlRecord = { code, url, hits: 0 };
    this.store.create(record);
    return { code, shortUrl: `${baseUrl}/${code}` };
  }

  getByCode(code: string): UrlRecord | undefined {
    return this.store.findByCode(code);
  }

  incrementHits(code: string): UrlRecord | undefined {
    return this.store.incrementHits(code);
  }

  getStats(code: string): UrlStatsResponse | undefined {
    const record = this.store.findByCode(code);
    if (!record) {
      return undefined;
    }
    return { code: record.code, url: record.url, hits: record.hits };
  }
}