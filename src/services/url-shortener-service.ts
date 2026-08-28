import type { InMemoryUrlStore } from '../store/in-memory-url-store.js';
import type {
  CreateShortUrlResult,
  ResolveResult,
  StatsResult,
} from '../types/url-record.js';

const CODE_LENGTH = 6;
const CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function generateCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]!;
  }
  return code;
}

function generateUniqueCode(store: InMemoryUrlStore): string {
  let code: string;
  do {
    code = generateCode();
  } while (store.findByCode(code) !== undefined);
  return code;
}

export class UrlShortenerService {
  private readonly store: InMemoryUrlStore;
  private readonly baseUrl: string;

  constructor(store: InMemoryUrlStore, port: number) {
    this.store = store;
    this.baseUrl = `http://localhost:${port}`;
  }

  create(url: unknown): CreateShortUrlResult {
    if (typeof url !== 'string') {
      return { ok: false, error: 'url must be a valid HTTP or HTTPS URL' };
    }

    const trimmed = url.trim();
    if (trimmed === '') {
      return { ok: false, error: 'url must be a valid HTTP or HTTPS URL' };
    }

    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      return { ok: false, error: 'url must be a valid HTTP or HTTPS URL' };
    }

    try {
      new URL(trimmed);
    } catch {
      return { ok: false, error: 'url must be a valid HTTP or HTTPS URL' };
    }

    const code = generateUniqueCode(this.store);
    this.store.save({ code, url: trimmed, hits: 0 });

    return {
      ok: true,
      value: { code, shortUrl: `${this.baseUrl}/${code}` },
    };
  }

  resolve(code: string): ResolveResult {
    const result = this.store.incrementHits(code);
    if (result === undefined) {
      return { ok: false };
    }
    return { ok: true, value: result };
  }

  getStats(code: string): StatsResult {
    const record = this.store.findByCode(code);
    if (record === undefined) {
      return { ok: false };
    }
    return {
      ok: true,
      value: { code: record.code, url: record.url, hits: record.hits },
    };
  }
}