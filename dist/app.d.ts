import { type Express } from 'express';
import { InMemoryUrlStore } from './store/in-memory-url-store.js';
export declare function createApp(store?: InMemoryUrlStore, port?: number): Express;
export declare function resolvePort(envPort?: string): number;
//# sourceMappingURL=app.d.ts.map