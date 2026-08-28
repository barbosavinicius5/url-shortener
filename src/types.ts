/**
 * Shared domain and HTTP contract types for the URL shortener service.
 */

/** A stored short URL record. */
export interface UrlRecord {
  /** Short identifier (6 alphanumeric characters). */
  code: string;
  /** Original destination URL (preserved exactly as provided). */
  url: string;
  /** Number of successful redirections served. */
  hits: number;
}

/** Body of a POST /shorten request (the field is validated, not trusted). */
export interface ShortenRequest {
  url?: unknown;
}

/** Body of a successful POST /shorten response. */
export interface ShortenResponse {
  code: string;
  shortUrl: string;
}

/** Body of a GET /:code/stats response. */
export interface StatsResponse {
  code: string;
  url: string;
  hits: number;
}

/** Body of an error response. */
export interface ErrorResponse {
  error: string;
}