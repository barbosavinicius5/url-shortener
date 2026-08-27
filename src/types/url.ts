export interface UrlRecord {
  code: string;
  url: string;
  hits: number;
}

export interface CreateShortUrlInput {
  url: unknown;
}

export interface CreateShortUrlResult {
  code: string;
  shortUrl: string;
}

export interface UrlStats {
  code: string;
  url: string;
  hits: number;
}