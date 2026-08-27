export type UrlRecord = {
  code: string;
  url: string;
  hits: number;
};

export type CreateShorteningInput = { url: unknown };
export type CreateShorteningResponse = { code: string; shortUrl: string };
export type StatsResponse = { code: string; url: string; hits: number };
