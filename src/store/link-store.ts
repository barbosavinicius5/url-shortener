import { LinkRecord } from '../types/link.js';

export class LinkStore {
  private readonly links = new Map<string, LinkRecord>();

  find(code: string): LinkRecord | undefined {
    const record = this.links.get(code);
    return record ? { ...record } : undefined;
  }

  save(link: LinkRecord): void {
    this.links.set(link.code, { ...link });
  }

  incrementHits(code: string): LinkRecord | undefined {
    const record = this.links.get(code);
    if (!record) {
      return undefined;
    }
    record.hits += 1;
    this.links.set(code, record);
    return { ...record };
  }

  clear(): void {
    this.links.clear();
  }
}