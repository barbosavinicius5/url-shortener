export interface UrlRecord {
  code: string;
  url: string;
  hits: number;
}

export interface CreateShortUrlResult {
  code: string;
  shortUrl: string;
}