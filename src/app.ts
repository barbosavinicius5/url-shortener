import express, { Express, NextFunction, Request, Response } from 'express';
import { InMemoryUrlStore } from './stores/in-memory-url.store';
import { UrlShortenerService } from './services/url-shortener.service';
import { createUrlRouter } from './routes/url.routes';

export interface AppOptions {
  store?: InMemoryUrlStore;
  port?: number;
}

export const DEFAULT_PORT = 3000;

export function createApp(options: AppOptions = {}): Express {
  const store = options.store ?? new InMemoryUrlStore();
  const port = options.port ?? DEFAULT_PORT;
  const service = new UrlShortenerService(store, port);
  const app = express();

  app.use(express.json());
  app.use(createUrlRouter(service));

  // Converts malformed JSON (express.json parse failures) into the same
  // contract used across the API: 400 with { error: string }.
  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (err && typeof err === 'object' && (err as { type?: string }).type === 'entity.parse.failed') {
      res.status(400).json({ error: 'Invalid JSON body' });
      return;
    }
    next(err);
  });

  return app;
}