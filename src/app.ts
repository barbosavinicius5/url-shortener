import express from 'express';
import type { ErrorRequestHandler } from 'express';
import type { UrlStore } from './types/url.js';
import { InMemoryUrlStore } from './store/in-memory-url.store.js';
import { UrlShortenerService } from './services/url-shortener.service.js';
import { createUrlRoutes } from './routes/url.routes.js';

export interface AppOptions {
  store?: UrlStore;
  baseUrl?: string;
}

export function createApp(options?: AppOptions): express.Application {
  const store = options?.store ?? new InMemoryUrlStore();
  const baseUrl = options?.baseUrl ?? 'http://localhost:3000';
  const service = new UrlShortenerService(store, baseUrl);

  const app = express();

  app.use(express.json());

  // Register routes
  app.use('/', createUrlRoutes(service));

  // JSON parse error handler
  const jsonErrorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof SyntaxError && 'body' in err) {
      res.status(400).json({ error: 'Invalid JSON in request body' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  };
  app.use(jsonErrorHandler);

  return app;
}