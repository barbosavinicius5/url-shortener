import { randomInt } from 'node:crypto';
import { UrlStore } from '../store/url.store';
import { UrlRecord } from '../types/url-record';

export const CODE_LENGTH = 6;
export const ALPHANUMERIC_CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const MAX_GENERATION_ATTEMPTS = 10_000;

export type CodeGenerator = () => string;

function randomCode(): string {
  let code = '';
  for (let index = 0; index < CODE_LENGTH; index += 1) {
    code += ALPHANUMERIC_CHARACTERS[randomInt(ALPHANUMERIC_CHARACTERS.length)];
  }
  return code;
}

export class ShortenerService {
  constructor(private readonly store: UrlStore, private readonly codeGenerator: CodeGenerator = randomCode) {}

  createShortUrl(url: string): UrlRecord {
    if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
      throw new Error('Invalid URL');
    }

    let code = '';
    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
      code = this.codeGenerator();
      if (!this.store.has(code)) {
        const record = { code, url, hits: 0 };
        this.store.set(record);
        return record;
      }
    }
    throw new Error('Unable to generate a unique short code');
  }

  resolveAndTrack(code: string): UrlRecord | undefined {
    return this.store.incrementHits(code);
  }

  getStats(code: string): UrlRecord | undefined {
    return this.store.get(code);
  }
}