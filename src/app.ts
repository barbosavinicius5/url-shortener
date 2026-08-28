import express, { Express, Request, Response, NextFunction } from 'express';
import { UrlShortenerService } from './services/url-shortener.service';
import { InMemoryUrlStore } from './stores/in-memory-url.store';
import { createUrlRoutes } from './routes/url.routes';

export interface CreateAppOptions {
  service?: UrlShortenerService;
  baseUrl?: string;
}

export function createApp(options: CreateAppOptions = {}): Express {
  const app = express();
  const store = new InMemoryUrlStore();
  const service = options.service ?? new UrlShortenerService(store);
  const baseUrl = options.baseUrl ?? 'http://localhost:3000';

  app.set('baseUrl', baseUrl);
  app.use(express.json());

  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof SyntaxError && 'status' in err && err.status === 400 && 'body' in err) {
      return res.status(400).json({ error: 'Invalid JSON' });
    }
    next(err);
  });

  app.use(createUrlRoutes(service));

  return app;
}