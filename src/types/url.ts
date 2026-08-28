/** Domain record stored in memory for each shortened URL. */
export interface UrlRecord {
  code: string;
  url: string;
  hits: number;
}

/** Response body returned by `POST /shorten`. */
export interface ShortenResponse {
  code: string;
  shortUrl: string;
}

/** Response body returned by `GET /:code/stats`. */
export interface StatsResponse {
  code: string;
  url: string;
  hits: number;
}