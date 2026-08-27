import express, { type ErrorRequestHandler } from 'express';
import { getBaseUrl, getPort } from './config/environment';
import { createUrlRouter } from './routes/url.routes';
import { UrlShortenerService } from './services/url-shortener.service';
import { InMemoryUrlStore } from './stores/in-memory-url.store';

export function createApp(port = getPort()): express.Express {
  const store = new InMemoryUrlStore();
  const service = new UrlShortenerService(store, getBaseUrl(port));
  const app = express();
  app.use(express.json());
  app.use(createUrlRouter(service));
  app.use((_req, res) => { res.status(404).json({ error: 'Not found' }); });
  const errorHandler: ErrorRequestHandler = (error, _req, res, _next): void => {
    if (error instanceof SyntaxError && 'body' in error) { res.status(400).json({ error: 'Invalid JSON' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  };
  app.use(errorHandler);
  return app;
}

export const app = createApp();