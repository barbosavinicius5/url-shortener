import express, { Express, NextFunction, Request, Response } from 'express';
import { AppConfig, loadConfig } from './config.js';
import { createUrlRouter } from './routes/url-routes.js';
import { UrlShortenerService } from './services/url-shortener-service.js';
import { UrlStore } from './store/url-store.js';
import { ErrorResponse } from './types/url.js';

export interface CreateAppOptions {
  /** Configuration (port/baseUrl); defaults to `loadConfig()` over `process.env`. */
  config?: AppConfig;
  /** Store to use; defaults to a fresh in-memory `UrlStore` (one per app instance). */
  store?: UrlStore;
}

function isErrorWithStatus(error: unknown): error is { status: number } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof (error as { status?: unknown }).status === 'number'
  );
}

/** Final error handler: always answers JSON, never leaks stack traces. */
function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  const status = isErrorWithStatus(error) && error.status >= 400 && error.status < 600 ? error.status : 500;
  const message =
    status < 500 && error instanceof Error ? error.message : 'Internal server error';
  const body: ErrorResponse = { error: message };
  res.status(status).json(body);
}

/**
 * Creates the Express application. A new store is instantiated per app by
 * default, which keeps test runs isolated. `listen` is never called here:
 * `src/server.ts` is the only entrypoint that starts the server.
 */
export function createApp(options: CreateAppOptions = {}): Express {
  const config = options.config ?? loadConfig();
  const store = options.store ?? new UrlStore();
  const service = new UrlShortenerService(store, config.baseUrl);

  const app = express();

  // Body parser registered before routes; malformed JSON reaches the error handler.
  app.use(express.json());
  app.use(createUrlRouter(service));

  // JSON 404 for unmatched routes (every response stays JSON, never HTML).
  app.use((req: Request, res: Response) => {
    const body: ErrorResponse = { error: `Route ${req.method} ${req.originalUrl} not found.` };
    res.status(404).json(body);
  });

  app.use(errorHandler);

  return app;
}