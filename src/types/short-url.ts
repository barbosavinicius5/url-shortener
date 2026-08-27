export interface ShortUrlRecord {
  code: string;
  url: string;
  hits: number;
}

export interface CreateShortUrlResponse {
  code: string;
  shortUrl: string;
}

export interface StatsResponse {
  code: string;
  url: string;
  hits: number;
}

export interface ErrorResponse {
  error: string;
}

export interface UrlStore {
  save(record: ShortUrlRecord): void;
  findByCode(code: string): ShortUrlRecord | undefined;
  incrementHits(code: string): ShortUrlRecord | undefined;
}