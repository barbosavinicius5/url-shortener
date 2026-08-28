export interface UrlRecord {
  code: string;
  url: string;
  hits: number;
}

export interface ShortenResponse {
  code: string;
  shortUrl: string;
}

export interface StatsResponse {
  code: string;
  url: string;
  hits: number;
}

export interface UrlStore {
  save(record: UrlRecord): void;
  findByCode(code: string): UrlRecord | undefined;
  incrementHits(code: string): UrlRecord | undefined;
}