export interface UrlRecord {
  code: string;
  url: string;
  hits: number;
}

export interface UrlStore {
  save(record: UrlRecord): void;
  findByCode(code: string): UrlRecord | undefined;
  incrementHits(code: string): UrlRecord | undefined;
}

export interface ShortenRequestBody {
  url?: unknown;
}