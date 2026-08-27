import { UrlRecord, UrlStore } from '../types/url';

export class InMemoryUrlStore implements UrlStore {
  private store: Map<string, UrlRecord>;

  constructor() {
    this.store = new Map();
  }

  save(record: UrlRecord): void {
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
    this.store.set(code, record);
    return { ...record };
  }
}