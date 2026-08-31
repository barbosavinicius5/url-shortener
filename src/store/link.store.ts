import type { LinkRecord } from '../types/link';

export class LinkStore {
  private readonly links = new Map<string, LinkRecord>();

  public create(record: LinkRecord): void {
    this.links.set(record.code, record);
  }

  public findByCode(code: string): LinkRecord | undefined {
    return this.links.get(code);
  }

  public has(code: string): boolean {
    return this.links.has(code);
  }
}