export interface UrlRecord {
  code: string;
  originalUrl: string;
  hits: number;
}

export interface CreateShortUrlInput {
  url: unknown;
}

export interface CreateShortUrlResponse {
  code: string;
  shortUrl: string;
}

export interface UrlStatsResponse {
  code: string;
  url: string;
  hits: number;
}

export interface ErrorResponse {
  error: string;
}