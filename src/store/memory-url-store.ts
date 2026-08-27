import {
  LinkRecord,
  UrlStore,
} from "../types/url-shortener";

export class MemoryUrlStore implements UrlStore {
  private readonly links = new Map<string, LinkRecord>();

  get(code: string): LinkRecord | undefined {
    return this.links.get(code);
  }

  has(code: string): boolean {
    return this.links.has(code);
  }

  save(record: LinkRecord): void {
    this.links.set(record.code, record);
  }

  incrementHits(code: string): LinkRecord | undefined {
    const record = this.links.get(code);
    if (!record) {
      return undefined;
    }
    record.hits += 1;
    return record;
  }
}