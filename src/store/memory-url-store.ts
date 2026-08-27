import { ShortenedUrl, UrlStore } from '../types';

export class MemoryUrlStore implements UrlStore {
  private readonly urls = new Map<string, ShortenedUrl>();

  has(code: string): boolean { return this.urls.has(code); }

  get(code: string): ShortenedUrl | undefined {
    const entry = this.urls.get(code);
    return entry ? { ...entry } : undefined;
  }

  save(entry: ShortenedUrl): void { this.urls.set(entry.code, { ...entry }); }

  incrementHits(code: string): ShortenedUrl | undefined {
    const entry = this.urls.get(code);
    if (!entry) return undefined;
    const updated = { ...entry, hits: entry.hits + 1 };
    this.urls.set(code, updated);
    return { ...updated };
  }
}
