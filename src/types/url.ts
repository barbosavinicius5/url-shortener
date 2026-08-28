export interface ShortUrlRecord {
  code: string;
  url: string;
  hits: number;
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
  find(code: string): ShortUrlRecord | undefined;
  save(record: ShortUrlRecord): void;
  incrementHits(code: string): ShortUrlRecord | undefined;
}

export type CodeGenerator = () => string;