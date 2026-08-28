export interface UrlRecord {
    code: string;
    url: string;
    hits: number;
}
export interface CreateShortUrlResponse {
    code: string;
    shortUrl: string;
}
export interface UrlStatsResponse {
    code: string;
    url: string;
    hits: number;
}
export interface ErrorResponse {
    error: string;
}
export type CreateShortUrlResult = {
    ok: true;
    value: CreateShortUrlResponse;
} | {
    ok: false;
    error: string;
};
export type ResolveResult = {
    ok: true;
    value: UrlRecord;
} | {
    ok: false;
};
export type StatsResult = {
    ok: true;
    value: UrlStatsResponse;
} | {
    ok: false;
};
//# sourceMappingURL=url-record.d.ts.map