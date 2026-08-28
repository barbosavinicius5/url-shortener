import { randomInt } from 'node:crypto';
import { InMemoryUrlStore } from '../storage/in-memory-url-store';
import { ShortenResponse, StatsResponse, UrlRecord } from '../types/url';

const CODE_LENGTH = 6;
const ALPHANUMERIC_CHARACTERS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export class UrlShortenerService {
  private readonly store: InMemoryUrlStore;
  private readonly port: number;

  constructor(store: InMemoryUrlStore, port: number) {
    this.store = store;
    this.port = port;
  }

  createShortUrl(url: unknown): ShortenResponse {
    if (typeof url !== 'string') {
      throw new Error('The "url" field is required and must be a string.');
    }

    const trimmed = url;
    if (
      !trimmed.startsWith('http://') &&
      !trimmed.startsWith('https://')
    ) {
      throw new Error(
        'The "url" field must start with "http://" or "https://".'
      );
    }

    const code = this.generateUniqueCode();
    const record: UrlRecord = this.store.save({ code, url: trimmed, hits: 0 });

    return { code: record.code, shortUrl: `http://localhost:${this.port}/${record.code}` };
  }

  resolveAndCount(code: string): UrlRecord | undefined {
    return this.store.incrementHits(code);
  }

  getStats(code: string): StatsResponse | undefined {
    const record = this.store.findByCode(code);
    if (!record) {
      return undefined;
    }
    return { code: record.code, url: record.url, hits: record.hits };
  }

  private generateUniqueCode(): string {
    let code = this.generateCode();
    while (this.store.findByCode(code) !== undefined) {
      code = this.generateCode();
    }
    return code;
  }

  private generateCode(): string {
    let code = '';
    for (let i = 0; i < CODE_LENGTH; i++) {
      const index = randomInt(ALPHANUMERIC_CHARACTERS.length);
      code += ALPHANUMERIC_CHARACTERS[index];
    }
    return code;
  }
}