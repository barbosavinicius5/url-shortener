import { UrlRecord } from '../types/url.types';

/**
 * In-memory storage for short URL records.
 *
 * The Map is the single source of truth for the lifetime of the process.
 * Mutation (hit counting) is encapsulated here so callers cannot forget it.
 */
export class InMemoryUrlStore {
  private readonly records = new Map<string, UrlRecord>();

  /** Persists a record. The service is responsible for guaranteeing a free code. */
  save(record: UrlRecord): UrlRecord {
    this.records.set(record.code, record);
    return record;
  }

  /** Returns the record for the given code, or undefined when absent. */
  findByCode(code: string): UrlRecord | undefined {
    return this.records.get(code);
  }

  /**
   * Increments hits exactly once for an existing record and returns the
   * updated record, or undefined when the code does not exist.
   */
  incrementHits(code: string): UrlRecord | undefined {
    const record = this.records.get(code);

    if (!record) {
      return undefined;
    }

    record.hits += 1;
    return record;
  }
}