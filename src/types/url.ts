export interface UrlRecord {
  readonly code: string;
  readonly url: string;
  hits: number;
}

export interface UrlStore {
  save(url: string, code: string): UrlRecord;
  find(code: string): UrlRecord | undefined;
  incrementHits(code: string): UrlRecord | undefined;
}