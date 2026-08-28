import { randomInt } from 'node:crypto';
import { InMemoryLinkStore } from '../store/in-memory-link-store';
import { CreateLinkResponse, LinkStats } from '../domain/link';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const CODE_LENGTH = 6;
const MAX_COLLISION_RETRIES = 100;

export type CodeGenerator = () => string;

export function defaultCodeGenerator(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return code;
}

export class UrlShortenerService {
  constructor(
    private readonly store: InMemoryLinkStore,
    private readonly generateCode: CodeGenerator = defaultCodeGenerator
  ) {}

  validateUrl(url: string): string | null {
    if (typeof url !== 'string' || url.trim().length === 0) {
      return 'URL must be a non-empty string.';
    }

    let parsed: URL;
    try {
      parsed = new URL(url.trim());
    } catch {
      return 'Invalid URL format.';
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return 'URL must use HTTP or HTTPS protocol.';
    }

    return null;
  }

  createLink(url: string, baseUrl: string): CreateLinkResponse {
    const validationError = this.validateUrl(url);
    if (validationError !== null) {
      throw new Error(`Validation failed: ${validationError}`);
    }

    let code: string;
    let attempts = 0;
    do {
      code = this.generateCode();
      attempts++;
      if (attempts > MAX_COLLISION_RETRIES) {
        throw new Error('Unable to generate a unique code after maximum retries.');
      }
    } while (!this.store.create({ code, url, hits: 0 }));

    return { code, shortUrl: `${baseUrl}/${code}` };
  }

  redirect(code: string): string | null {
    const link = this.store.findByCode(code);
    if (!link) {
      return null;
    }
    this.store.incrementHits(code);
    return link.url;
  }

  getStats(code: string): LinkStats | null {
    const link = this.store.findByCode(code);
    if (!link) {
      return null;
    }
    return { code: link.code, url: link.url, hits: link.hits };
  }
}