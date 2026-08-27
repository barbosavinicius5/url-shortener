import { UrlRecord } from "../types/url";

export class UrlStore {
  private readonly records = new Map<string, UrlRecord>();

  get(code: string): UrlRecord | undefined {
    const record = this.records.get(code);
    if (record === undefined) {
      return undefined;
    }
    return { ...record };
  }

  set(record: UrlRecord): void {
    this.records.set(record.code, { ...record });
  }

  has(code: string): boolean {
    return this.records.has(code);
  }

  incrementHits(code: string): UrlRecord | undefined {
    const record = this.records.get(code);
    if (record === undefined) {
      return undefined;
    }
    record.hits += 1;
    this.records.set(code, record);
    return { ...record };
  }
}