import express, { Express, Request, Response, NextFunction } from 'express';
import { InMemoryUrlStore } from './store/url.store';
import { UrlService } from './services/url.service';
import { createUrlRouter } from './routes/url.routes';
import { DEFAULT_PORT } from './config/env';

export interface CreateAppOptions {
  port?: number;
  service?: UrlService;
  store?: InMemoryUrlStore;
}

export function createApp(options?: CreateAppOptions): Express {
  const app = express();

  app.use(express.json());

  // Handle malformed JSON body
  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (err instanceof SyntaxError && 'status' in err && (err as { status: unknown }).status === 400 && 'body' in err) {
      res.status(400).json({ error: 'Invalid JSON body' });
      return;
    }
    next(err);
  });

  const port = options?.port ?? DEFAULT_PORT;
  const store = options?.store ?? new InMemoryUrlStore();
  const service = options?.service ?? new UrlService(store, port);

  app.use('/', createUrlRouter(service));

  // Global error handler
  app.use((_err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}