export interface LinkRecord {
  code: string;
  url: string;
  hits: number;
}

export interface LinkStore {
  get(code: string): LinkRecord | undefined;
  save(record: LinkRecord): void;
  incrementHits(code: string): LinkRecord | undefined;
}

export interface LinkStats {
  code: string;
  url: string;
  hits: number;
}