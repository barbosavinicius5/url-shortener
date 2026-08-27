export interface ShortenedUrl {
  code: string;
  url: string;
  hits: number;
}

export interface CreateShortenRequest {
  url?: unknown;
}

export interface CreateShortenResponse {
  code: string;
  shortUrl: string;
}

export interface StatsResponse {
  code: string;
  url: string;
  hits: number;
}