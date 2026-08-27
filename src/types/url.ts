export interface UrlRecord {
  code: string;
  url: string;
  hits: number;
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