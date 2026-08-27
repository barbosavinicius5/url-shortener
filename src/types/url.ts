export interface UrlRecord {
  code: string;
  url: string;
  hits: number;
}

export interface CreateShortUrlResult {
  code: string;
  shortUrl: string;
}

export interface UrlStats {
  code: string;
  url: string;
  hits: number;
}

export interface UrlStore {
  findByCode(code: string): UrlRecord | undefined;
  save(record: UrlRecord): void;
  incrementHits(code: string): UrlRecord | undefined;
}