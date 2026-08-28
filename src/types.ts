export interface UrlRecord {
  code: string;
  url: string;
  hits: number;
}

export interface CreateShortUrlInput {
  url: string;
}

export interface CreateShortUrlResponse {
  code: string;
  shortUrl: string;
  hits: number;
}

export interface StatsResponse {
  code: string;
  url: string;
  hits: number;
}

export interface UrlStore {
  find(code: string): UrlRecord | undefined;
  save(record: UrlRecord): void;
  incrementHits(code: string): UrlRecord | undefined;
}

export interface AppConfig {
  port: number;
}