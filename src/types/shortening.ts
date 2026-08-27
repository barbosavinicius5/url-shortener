export interface CreateShorteningBody {
  url?: unknown;
}

export interface ShorteningRecord {
  code: string;
  url: string;
  hits: number;
}

export interface CreateShorteningResponse {
  code: string;
  shortUrl: string;
}

export interface ShorteningStatsResponse {
  code: string;
  url: string;
  hits: number;
}