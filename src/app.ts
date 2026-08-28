import express, { Express } from 'express';
import { UrlStore } from './stores/urlStore';
import { UrlShortenerService } from './services/urlShortenerService';
import { createUrlRouter, jsonErrorHandler } from './routes/urlRoutes';

export const DEFAULT_PORT = 3000;

/**
 * Resolves the listening port from `process.env.PORT`.
 * - undefined/empty  -> DEFAULT_PORT (3000)
 * - invalid (non-integer or <= 0) -> fails early with a clear message
 * - valid positive integer -> that value
 */
export function resolvePort(): number {
  const raw = process.env.PORT;
  if (raw === undefined || raw.trim() === '') {
    return DEFAULT_PORT;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid PORT value "${raw}": expected a positive integer`);
  }
  return parsed;
}

/**
 * Factory that builds a fully configured Express app with a fresh store and
 * service. It never opens a socket, so it can be imported/tested safely. The
 * injected `port` is forwarded to the service so the returned `shortUrl`
 * reflects the real configuration.
 */
export function createApp(port: number = resolvePort()): Express {
  const store = new UrlStore();
  const service = new UrlShortenerService(store);
  const app = express();
  app.use(express.json());
  app.use(createUrlRouter(service, port));
  app.use(jsonErrorHandler);
  return app;
}

/**
 * Default app instance (used by `server.ts` and as a convenience import).
 * Tests should prefer `createApp(port)` for isolated state.
 */
export const app = createApp();