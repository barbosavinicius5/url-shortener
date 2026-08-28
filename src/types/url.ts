export interface UrlRecord {
  code: string;
  url: string;
  hits: number;
}

export interface UrlStore {
  get(code: string): UrlRecord | undefined;
  save(record: UrlRecord): void;
  has(code: string): boolean;
  incrementHits(code: string): UrlRecord | undefined;
}

export interface ShortenResult {
  code: string;
  shortUrl: string;
}