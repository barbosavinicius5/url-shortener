import { UrlRecord } from '../types/url';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const CODE_LENGTH = 6;
const MAX_RETRY = 10;

export class InMemoryUrlStore {
  private store = new Map<string, UrlRecord>();

  findByCode(code: string): UrlRecord | undefined {
    const record = this.store.get(code);
    if (record) {
      return { ...record };
    }
    return undefined;
  }

  create(code: string, url: string): UrlRecord {
    const record: UrlRecord = { code, url, hits: 0 };
    this.store.set(code, record);
    return { ...record };
  }

  incrementHits(code: string): void {
    const record = this.store.get(code);
    if (record) {
      record.hits++;
    }
  }

  has(code: string): boolean {
    return this.store.has(code);
  }

  generateCode(): string {
    let code: string;
    let attempts = 0;
    do {
      code = '';
      for (let i = 0; i < CODE_LENGTH; i++) {
        code += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
      }
      attempts++;
      if (attempts > MAX_RETRY) {
        throw new Error('Failed to generate unique code after maximum retries');
      }
    } while (this.store.has(code));
    return code;
  }

  clear(): void {
    this.store.clear();
  }
}