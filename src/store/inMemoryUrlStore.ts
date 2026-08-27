import type { UrlRecord, UrlStore } from '../types/url.js';

export class InMemoryUrlStore implements UrlStore {
  private store = new Map<string, UrlRecord>();

  findByCode(code: string): UrlRecord | undefined {
    const record = this.store.get(code);
    if (record) {
      return { ...record };
    }
    return undefined;
  }

  save(record: UrlRecord): void {
    this.store.set(record.code, { ...record });
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