export interface UrlRecord {
  code: string;
  url: string;
  hits: number;
}

export interface UrlStore {
  create(record: UrlRecord): void;
  findByCode(code: string): UrlRecord | undefined;
  incrementHits(code: string): UrlRecord | undefined;
}

export const CODE_LENGTH = 6;
export const CODE_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';