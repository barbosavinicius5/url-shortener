export interface UrlRecord {
  code: string;
  url: string;
  hits: number;
}

export class UrlStore {
  private readonly records = new Map<string, UrlRecord>();

  create(url: string, code: string): UrlRecord {
    if (this.records.has(code)) {
      throw new Error(`short code already exists: ${code}`);
    }
    const record: UrlRecord = { code, url, hits: 0 };
    this.records.set(code, record);
    return { ...record };
  }

  findByCode(code: string): UrlRecord | undefined {
    const record = this.records.get(code);
    return record ? { ...record } : undefined;
  }

  incrementHits(code: string): UrlRecord | undefined {
    const record = this.records.get(code);
    if (!record) return undefined;
    const updated = { ...record, hits: record.hits + 1 };
    this.records.set(code, updated);
    return { ...updated };
  }
}