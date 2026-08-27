export interface ShortenedUrl {
  code: string;
  url: string;
  hits: number;
}

export interface CreateShortUrlResult {
  code: string;
  shortUrl: string;
}

export interface UrlStore {
  has(code: string): boolean;
  get(code: string): ShortenedUrl | undefined;
  save(entry: ShortenedUrl): void;
  incrementHits(code: string): ShortenedUrl | undefined;
}
