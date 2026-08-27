export interface ShortUrlRecord {
  readonly code: string;
  readonly url: string;
  hits: number;
}

export interface CreateShortUrlInput {
  readonly url: string;
}

export interface CreateShortUrlResult {
  readonly code: string;
  readonly shortUrl: string;
}

export interface ShortUrlStats {
  readonly code: string;
  readonly url: string;
  readonly hits: number;
}