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

export interface ShortenBody {
  url?: unknown;
}