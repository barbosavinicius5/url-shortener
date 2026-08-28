import { UrlLink } from "../domain/url-link";

export class LinkStore {
  private readonly links = new Map<string, UrlLink>();

  get(code: string): UrlLink | undefined {
    const link = this.links.get(code);
    if (!link) {
      return undefined;
    }
    return { ...link };
  }

  has(code: string): boolean {
    return this.links.has(code);
  }

  save(link: UrlLink): void {
    if (this.links.has(link.code)) {
      throw new Error(`Link with code "${link.code}" already exists`);
    }
    this.links.set(link.code, { ...link, hits: 0 });
  }

  incrementHits(code: string): void {
    const link = this.links.get(code);
    if (link) {
      this.links.set(code, { ...link, hits: link.hits + 1 });
    }
  }
}