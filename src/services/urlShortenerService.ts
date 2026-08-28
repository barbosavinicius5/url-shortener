import { randomInt } from 'node:crypto';
import { UrlStore } from '../store/urlStore.js';
import type { ShortenResponse, StatsResponse, UrlRecord } from '../types/url.js';

const CODE_LENGTH = 6;
const ALPHANUMERIC_CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export class InvalidUrlError extends Error {
  constructor() {
    super('URL must start with http:// or https://');
    this.name = 'InvalidUrlError';
  }
}

export class UrlShortenerService {
  constructor(private readonly store: UrlStore) {}

  shorten(url: unknown, baseUrl: string): ShortenResponse {
    if (typeof url !== 'string' || (!url.startsWith('http://') && !url.startsWith('https://'))) {
      throw new InvalidUrlError();
    }

    let code = this.generateCode();
    while (this.store.has(code)) {
      code = this.generateCode();
    }

    const record: UrlRecord = { code, url, hits: 0 };
    this.store.save(record);

    return { code, shortUrl: `${baseUrl}/${code}` };
  }

  redirect(code: string): UrlRecord | undefined {
    const record = this.store.get(code);
    if (record === undefined) {
      return undefined;
    }

    record.hits += 1;
    return record;
  }

  getStats(code: string): StatsResponse | undefined {
    const record = this.store.get(code);
    if (record === undefined) {
      return undefined;
    }

    return { code: record.code, url: record.url, hits: record.hits };
  }

  private generateCode(): string {
    let code = '';
    for (let index = 0; index < CODE_LENGTH; index += 1) {
      code += ALPHANUMERIC_CHARACTERS[randomInt(ALPHANUMERIC_CHARACTERS.length)];
    }
    return code;
  }
}