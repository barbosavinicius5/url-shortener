export interface UrlShortenerRecord {
  code: string;
  url: string;
  hits: number;
}

export interface CreateShortUrlPayload {
  url: unknown;
}

export interface ShortUrlResponse {
  code: string;
  shortUrl: string;
}