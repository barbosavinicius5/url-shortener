export interface ShortUrlRecord {
  code: string;
  url: string;
  hits: number;
}

export interface ShortenRequestBody {
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

export interface ErrorResponse {
  error: string;
}