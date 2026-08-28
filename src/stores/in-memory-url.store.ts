import { UrlRecord } from '../types/url';

export class InMemoryUrlStore {
  private readonly store = new Map<string, UrlRecord>();

  set(record: UrlRecord): void {
    this.store.set(record.code, { ...record });
  }

  get(code: string): UrlRecord | undefined {
    const record = this.store.get(code);
    return record ? { ...record } : undefined;
  }

  has(code: string): boolean {
    return this.store.has(code);
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