import type { UrlRecord } from '../types/url-record.js';
export declare class InMemoryUrlStore {
    private readonly records;
    save(record: UrlRecord): void;
    findByCode(code: string): UrlRecord | undefined;
    incrementHits(code: string): UrlRecord | undefined;
}
//# sourceMappingURL=in-memory-url-store.d.ts.map