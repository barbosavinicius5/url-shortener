export interface ShortUrlRecord {
  code: string;
  url: string;
  hits: number;
}

export interface CreateShortUrlRequest {
  url?: unknown;
}

export interface CreateShortUrlResponse {
  code: string;
  shortUrl: string;
}

export interface ShortUrlStatsResponse {
  code: string;
  url: string;
  hits: number;
}

export interface ShortUrlStore {
  get(code: string): ShortUrlRecord | undefined;
  has(code: string): boolean;
  set(code: string, record: ShortUrlRecord): void;
  incrementHits(code: string): ShortUrlRecord | undefined;
}