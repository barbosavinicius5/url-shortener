import type { UrlRecord, UrlStore } from '../types/url';

/**
 * In-memory UrlStore backed by a single Map. Each instance owns its own Map,
 * so applications created independently never share state. Returned records
 * are copies: callers cannot mutate the stored entries from the outside.
 */
export class InMemoryUrlStore implements UrlStore {
  private readonly records = new Map<string, UrlRecord>();

  save(record: UrlRecord): void {
    this.records.set(record.code, { ...record });
  }

  findByCode(code: string): UrlRecord | undefined {
    const record = this.records.get(code);
    return record === undefined ? undefined : { ...record };
  }

  incrementHits(code: string): UrlRecord | undefined {
    const record = this.records.get(code);
    if (record === undefined) {
      return undefined;
    }
    const updated: UrlRecord = { ...record, hits: record.hits + 1 };
    this.records.set(code, updated);
    return { ...updated };
  }
}