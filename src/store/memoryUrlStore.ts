import type { UrlRecord, UrlStore } from "../types/url";

export class MemoryUrlStore implements UrlStore {
  private readonly store: Map<string, UrlRecord> = new Map();

  get(code: string): UrlRecord | undefined {
    const record = this.store.get(code);
    return record ? { ...record } : undefined;
  }

  save(record: UrlRecord): void {
    if (this.store.has(record.code)) {
      throw new Error(`Code "${record.code}" already exists`);
    }
    this.store.set(record.code, { ...record });
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