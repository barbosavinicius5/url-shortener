/** Record kept in memory for every shortened URL. */
export interface ShortUrlRecord {
  code: string;
  url: string;
  hits: number;
}

/** Body returned by `POST /shorten`. */
export interface CreateShortUrlResponse {
  code: string;
  shortUrl: string;
}

/** Body returned by `GET /:code/stats`. */
export interface StatsResponse {
  code: string;
  url: string;
  hits: number;
}

/** Immutable application configuration shared by the HTTP layer and the service. */
export interface AppConfig {
  port: number;
  baseUrl: string;
}