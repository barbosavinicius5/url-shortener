import { Link } from '../domain/link';

export class InMemoryLinkStore {
  private readonly links: Map<string, Link>;

  constructor() {
    this.links = new Map<string, Link>();
  }

  findByCode(code: string): Link | undefined {
    return this.links.get(code);
  }

  create(link: Link): boolean {
    if (this.links.has(link.code)) {
      return false;
    }
    this.links.set(link.code, link);
    return true;
  }

  save(link: Link): void {
    this.links.set(link.code, link);
  }

  incrementHits(code: string): boolean {
    const link = this.links.get(code);
    if (!link) {
      return false;
    }
    link.hits += 1;
    return true;
  }

  size(): number {
    return this.links.size;
  }
}