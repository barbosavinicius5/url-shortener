import { LinkRecord } from '../types/link';

export class LinkStore {
  private readonly store: Map<string, LinkRecord>;

  constructor() {
    this.store = new Map<string, LinkRecord>();
  }

  save(record: LinkRecord): void {
    this.store.set(record.code, record);
  }

  getByCode(code: string): LinkRecord | undefined {
    return this.store.get(code);
  }

  hasCode(code: string): boolean {
    return this.store.has(code);
  }

  incrementHits(code: string): LinkRecord | undefined {
    const record = this.store.get(code);
    if (!record) {
      return undefined;
    }
    const updated: LinkRecord = { ...record, hits: record.hits + 1 };
    this.store.set(code, updated);
    return updated;
  }
}