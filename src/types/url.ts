export interface UrlRecord {
  readonly code: string;
  readonly url: string;
  hits: number;
}

export interface ShortenRequest {
  url?: unknown;
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