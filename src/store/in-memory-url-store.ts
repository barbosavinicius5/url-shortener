import { UrlRecord, UrlStore } from "../types";

export class DuplicateCodeError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(`short code "${code}" is already in use`);
    this.name = "DuplicateCodeError";
    this.code = code;
  }
}

/**
 * Process-local, in-memory store for short URL records.
 * A new instance represents a new, empty state; data does not survive restarts.
 */
export class InMemoryUrlStore implements UrlStore {
  private readonly records = new Map<string, UrlRecord>();

  find(code: string): UrlRecord | undefined {
    const record = this.records.get(code);
    return record === undefined ? undefined : { ...record };
  }

  save(record: UrlRecord): void {
    if (this.records.has(record.code)) {
      throw new DuplicateCodeError(record.code);
    }
    this.records.set(record.code, { ...record });
  }

  incrementHits(code: string): UrlRecord | undefined {
    const record = this.records.get(code);
    if (record === undefined) {
      return undefined;
    }
    record.hits += 1;
    return { ...record };
  }
}