export interface UrlRecord {
  code: string;
  url: string;
  hits: number;
}

export interface CreateShortUrlResult {
  code: string;
  shortUrl: string;
}

export interface UrlStore {
  get(code: string): UrlRecord | undefined;
  save(record: UrlRecord): void;
  incrementHits(code: string): UrlRecord | undefined;
}