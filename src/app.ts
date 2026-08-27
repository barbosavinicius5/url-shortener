import express from 'express';

import { createRouter, errorHandler } from './http/routes';
import { InMemoryUrlStore } from './store/in-memory-url-store';
import { UrlShortenerService } from './services/url-shortener-service';
import { DEFAULT_PORT } from './config';

export interface AppDependencies {
  store?: InMemoryUrlStore;
  service?: UrlShortenerService;
  port?: number;
}

/**
 * Builds the Express application. The port is used both as the base of the
 * generated shortUrl and (in server.ts) as the app.listen port, so they can
 * never diverge. Does NOT call listen — that is the sole responsibility of
 * src/server.ts, which keeps tests free of open ports and global state.
 */
export function createApp(deps: AppDependencies = {}): express.Express {
  const port = deps.port ?? DEFAULT_PORT;
  const baseUrl = `http://localhost:${port}`;
  const store = deps.store ?? new InMemoryUrlStore();
  const service = deps.service ?? new UrlShortenerService(store, baseUrl);

  const app = express();
  app.use(express.json());
  app.use(createRouter(service));
  app.use(errorHandler);

  return app;
}