import type { LinkRecord, LinkStore } from '../domain/link.js';

export class InMemoryLinkStore implements LinkStore {
  private readonly links = new Map<string, LinkRecord>();

  get(code: string): LinkRecord | undefined {
    const record = this.links.get(code);
    return record ? { ...record } : undefined;
  }

  save(record: LinkRecord): void {
    this.links.set(record.code, { ...record });
  }

  incrementHits(code: string): LinkRecord | undefined {
    const record = this.links.get(code);
    if (!record) {
      return undefined;
    }

    const updatedRecord: LinkRecord = { ...record, hits: record.hits + 1 };
    this.links.set(code, updatedRecord);
    return { ...updatedRecord };
  }
}