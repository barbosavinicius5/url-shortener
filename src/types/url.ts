export interface ShortUrlRecord {
  code: string;
  url: string;
  hits: number;
}

export interface CreateShortUrlResult {
  code: string;
  shortUrl: string;
}

export interface UrlStore {
  save(record: ShortUrlRecord): void;
  findByCode(code: string): ShortUrlRecord | undefined;
  incrementHits(code: string): void;
  clear(): void;
}