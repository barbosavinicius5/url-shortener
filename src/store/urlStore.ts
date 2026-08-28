import type { UrlRecord } from "../types/url";

/**
 * In-memory persistence for shortened URLs.
 *
 * Encapsulates a Map<string, UrlRecord> and never exposes the underlying
 * collection nor lets handlers mutate records directly. All reads return
 * defensive copies so callers cannot mutate internal state.
 */
export class UrlStore {
  private readonly records = new Map<string, UrlRecord>();

  findByCode(code: string): UrlRecord | undefined {
    const record = this.records.get(code);
    return record ? { ...record } : undefined;
  }

  exists(code: string): boolean {
    return this.records.has(code);
  }

  save(record: UrlRecord): UrlRecord {
    const stored: UrlRecord = { ...record };
    this.records.set(stored.code, stored);
    return { ...stored };
  }

  incrementHits(code: string): UrlRecord | undefined {
    const record = this.records.get(code);
    if (!record) {
      return undefined;
    }
    record.hits += 1;
    return { ...record };
  }
}