import type { InMemoryUrlStore } from '../store/in-memory-url-store.js';
import type { CreateShortUrlResult, ResolveResult, StatsResult } from '../types/url-record.js';
export declare class UrlShortenerService {
    private readonly store;
    private readonly baseUrl;
    constructor(store: InMemoryUrlStore, port: number);
    create(url: unknown): CreateShortUrlResult;
    resolve(code: string): ResolveResult;
    getStats(code: string): StatsResult;
}
//# sourceMappingURL=url-shortener-service.d.ts.map