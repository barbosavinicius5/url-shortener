export interface ShortUrlRecord {
  code: string;
  url: string;
  hits: number;
}

export interface CreateShortUrlResponse {
  code: string;
  shortUrl: string;
}

export interface ErrorResponse {
  error: string;
}

export interface UrlShortenerConfig {
  port: number;
}