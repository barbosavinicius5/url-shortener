export interface UrlLink {
  code: string;
  url: string;
  hits: number;
}

export interface ShortenResult {
  code: string;
  shortUrl: string;
}

export interface LinkStats {
  code: string;
  url: string;
  hits: number;
}

export interface ShortenRequestBody {
  url?: unknown;
}