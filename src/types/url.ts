export interface UrlRecord {
  code: string;
  url: string;
  hits: number;
}

export interface UrlStore {
  get(code: string): UrlRecord | undefined;
  save(record: UrlRecord): void;
  has(code: string): boolean;
}

export interface ShortenResponse {
  code: string;
  shortUrl: string;
}