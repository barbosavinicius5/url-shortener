export interface UrlRecord {
  readonly code: string;
  readonly url: string;
  readonly hits: number;
}

export class UrlStore {
  private readonly records = new Map<string, UrlRecord>();

  get(code: string): UrlRecord | undefined {
    const record = this.records.get(code);
    if (record === undefined) {
      return undefined;
    }
    return { ...record };
  }

  has(code: string): boolean {
    return this.records.has(code);
  }

  save(record: UrlRecord): void {
    if (this.records.has(record.code)) {
      throw new Error(`Record with code "${record.code}" already exists.`);
    }
    this.records.set(record.code, { ...record });
  }

  incrementHits(code: string): UrlRecord | undefined {
    const record = this.records.get(code);
    if (record === undefined) {
      return undefined;
    }
    const updated: UrlRecord = {
      code: record.code,
      url: record.url,
      hits: record.hits + 1,
    };
    this.records.set(code, updated);
    return { ...updated };
  }
}