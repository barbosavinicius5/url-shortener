export interface UrlRecord {
  code: string;
  url: string;
  hits: number;
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

export interface UrlStore {
  has(code: string): boolean;
  findByCode(code: string): UrlRecord | undefined;
  create(record: UrlRecord): void;
  incrementHits(code: string): UrlRecord | undefined;
}

export type CodeGenerator = () => string;