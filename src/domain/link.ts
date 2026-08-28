export interface Link {
  code: string;
  url: string;
  hits: number;
}

export interface CreateLinkResponse {
  code: string;
  shortUrl: string;
}

export interface LinkStats {
  code: string;
  url: string;
  hits: number;
}