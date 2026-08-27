export interface UrlRecord {
  readonly code: string;
  readonly url: string;
  hits: number;
}

export interface UrlStore {
  create(record: UrlRecord): void;
  findByCode(code: string): UrlRecord | undefined;
  incrementHits(code: string): UrlRecord | undefined;
}

export interface AppConfig {
  readonly port: number;
  readonly baseUrl?: string;
}

export interface CreateResponse {
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