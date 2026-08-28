export interface UrlRecord {
  code: string;
  url: string;
  hits: number;
}

export interface UrlStore {
  get(code: string): UrlRecord | undefined;
  save(record: UrlRecord): void;
  clear(): void;
}

export class InMemoryUrlStore implements UrlStore {
  private readonly records = new Map<string, UrlRecord>();

  get(code: string): UrlRecord | undefined {
    const record = this.records.get(code);
    if (!record) {
      return undefined;
    }
    return { ...record };
  }

  save(record: UrlRecord): void {
    this.records.set(record.code, { ...record });
  }

  clear(): void {
    this.records.clear();
  }
}