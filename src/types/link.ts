export interface LinkRecord {
  code: string;
  originalUrl: string;
  hits: number;
}

export interface CreateLinkResponse {
  code: string;
  shortUrl: string;
}

export interface LinkStatsResponse {
  code: string;
  url: string;
  hits: number;
}