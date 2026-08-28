import { ShortUrlRecord, ShortUrlStore } from "../types/url";

export class InMemoryUrlStore implements ShortUrlStore {
  private readonly records = new Map<string, ShortUrlRecord>();

  find(code: string): ShortUrlRecord | undefined {
    return this.records.get(code);
  }

  save(record: ShortUrlRecord): void {
    this.records.set(record.code, record);
  }

  incrementHits(code: string): ShortUrlRecord | undefined {
    const record = this.records.get(code);
    if (!record) {
      return undefined;
    }
    record.hits += 1;
    return record;
  }
}