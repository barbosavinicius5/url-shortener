import { randomInt } from 'node:crypto';
import { UrlStore } from '../store/url-store';

export const CODE_LENGTH = 6;
export const DEFAULT_PORT = 3000;
export const ALPHANUMERIC_CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const MAX_CODE_ATTEMPTS = 10;

export interface ShorteningResponse { code: string; shortUrl: string; }
export interface StatsResponse { code: string; url: string; hits: number; }

export function validateUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.trim() === '') return 'url is required';
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return 'url must be a valid HTTP or HTTPS URL';
    }
  } catch {
    return 'url must be a valid HTTP or HTTPS URL';
  }
  return undefined;
}

export function generateCode(): string {
  let code = '';
  for (let index = 0; index < CODE_LENGTH; index += 1) {
    code += ALPHANUMERIC_CHARACTERS[randomInt(ALPHANUMERIC_CHARACTERS.length)];
  }
  return code;
}

export function generateUniqueCode(store: UrlStore): string {
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
    const code = generateCode();
    if (!store.findByCode(code)) return code;
  }
  throw new Error('unable to generate a unique short code');
}

export class UrlShortener {
  constructor(private readonly store: UrlStore, private readonly port: number) {}

  createShortening(value: unknown): ShorteningResponse {
    const error = validateUrl(value);
    if (error) throw new Error(error);
    const url = value as string;
    const code = generateUniqueCode(this.store);
    this.store.create(url, code);
    return { code, shortUrl: `http://localhost:${this.port}/${code}` };
  }

  redirectByCode(code: string): string | undefined {
    const record = this.store.findByCode(code);
    if (!record) return undefined;
    this.store.incrementHits(code);
    return record.url;
  }

  getStats(code: string): StatsResponse | undefined {
    const record = this.store.findByCode(code);
    return record ? { code: record.code, url: record.url, hits: record.hits } : undefined;
  }
}