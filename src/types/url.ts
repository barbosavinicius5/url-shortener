/** Persisted record for a shortened URL. */
export interface UrlRecord {
  code: string;
  url: string;
  hits: number;
}

/** Payload returned by `POST /shorten` on success. */
export interface CreateShortUrlResponse {
  code: string;
  shortUrl: string;
}

/** Payload returned by `GET /:code/stats` on success. */
export interface StatsResponse {
  code: string;
  url: string;
  hits: number;
}

/** Payload returned by every error response. */
export interface ErrorResponse {
  error: string;
}