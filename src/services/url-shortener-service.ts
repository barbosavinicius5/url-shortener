import { CreateShortenResponse, ShortenedUrl, StatsResponse } from '../types/url';
import { UrlStore } from '../store/url-store';

const CODE_LENGTH = 6;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const MAX_GENERATION_ATTEMPTS = 1000;

type CodeGenerator = () => string;

export class UrlShortenerService {
  constructor(
    private readonly store: UrlStore,
    private readonly baseUrl: string,
    private readonly codeGenerator: CodeGenerator = generateCode,
  ) {}

  shortenUrl(url: unknown): CreateShortenResponse {
    const originalUrl = this.validateUrl(url);
    let code: string | undefined;
    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
      const candidate = this.codeGenerator();
      if (!this.store.findByCode(candidate)) {
        code = candidate;
        break;
      }
    }
    if (!code) throw new Error('Unable to generate a unique code');
    this.store.save(code, originalUrl);
    return { code, shortUrl: `${this.baseUrl}/${code}` };
  }

  redirectByCode(code: string): ShortenedUrl | undefined {
    return this.store.incrementHits(code);
  }

  getStats(code: string): StatsResponse | undefined {
    const record = this.store.findByCode(code);
    return record ? { code: record.code, url: record.url, hits: record.hits } : undefined;
  }

  private validateUrl(url: unknown): string {
    if (typeof url !== 'string') throw new Error('URL must be a string');
    const trimmedUrl = url.trim();
    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
      throw new Error('URL must start with http:// or https://');
    }
    return trimmedUrl;
  }
}

export function generateCode(): string {
  let code = '';
  for (let index = 0; index < CODE_LENGTH; index += 1) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}