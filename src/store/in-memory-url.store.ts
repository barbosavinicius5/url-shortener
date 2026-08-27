import type { UrlRecord } from '../types/url.js';
import type { UrlStore } from './url.store.js';

export class InMemoryUrlStore implements UrlStore {
  private readonly store = new Map<string, UrlRecord>();

  create(record: UrlRecord): void {
    if (this.store.has(record.code)) {
      throw new Error(`Code already exists: ${record.code}`);
    }
    this.store.set(record.code, { ...record });
  }

  findByCode(code: string): UrlRecord | undefined {
    const record = this.store.get(code);
    return record ? { ...record } : undefined;
  }

  incrementHits(code: string): UrlRecord | undefined {
    const record = this.store.get(code);
    if (!record) {
      return undefined;
    }
    record.hits += 1;
    return { ...record };
  }
}