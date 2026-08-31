import type { LinkStats, ShortenResult } from '../types/link';
import { LinkStore } from '../store/link.store';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const CODE_LENGTH = 6;

export class UrlShortenerService {
  public constructor(
    private readonly store: LinkStore,
    private readonly port: number,
  ) {}

  public shorten(url: string): ShortenResult {
    this.validateUrl(url);
    let code = this.generateCode();
    while (this.store.has(code)) {
      code = this.generateCode();
    }
    this.store.create({ code, url, hits: 0 });
    return { code, shortUrl: `http://localhost:${this.port}/${code}` };
  }

  public resolve(code: string): string | undefined {
    const record = this.store.findByCode(code);
    if (record === undefined) return undefined;
    record.hits += 1;
    return record.url;
  }

  public getStats(code: string): LinkStats | undefined {
    const record = this.store.findByCode(code);
    if (record === undefined) return undefined;
    return { code: record.code, url: record.url, hits: record.hits };
  }

  private validateUrl(url: string): void {
    if (typeof url !== 'string' || url.length === 0 ||
        (!url.startsWith('http://') && !url.startsWith('https://'))) {
      throw new Error('URL must be a valid HTTP or HTTPS URL');
    }
    try {
      new URL(url);
    } catch {
      throw new Error('URL must be a valid HTTP or HTTPS URL');
    }
  }

  private generateCode(): string {
    let code = '';
    for (let index = 0; index < CODE_LENGTH; index += 1) {
      code += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length));
    }
    return code;
  }
}