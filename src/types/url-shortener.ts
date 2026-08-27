export interface LinkRecord {
  readonly code: string;
  readonly url: string;
  hits: number;
}

export interface CreateShortUrlResponse {
  code: string;
  shortUrl: string;
}

export interface StatsResponse {
  code: string;
  url: string;
  hits: number;
}

export interface UrlStore {
  get(code: string): LinkRecord | undefined;
  has(code: string): boolean;
  save(record: LinkRecord): void;
  incrementHits(code: string): LinkRecord | undefined;
}

export type ValidationError = {
  error: string;
};