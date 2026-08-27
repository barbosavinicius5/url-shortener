import express, { ErrorRequestHandler, Request, Response } from 'express';
import { getPort } from './config';
import { createUrlRouter } from './routes/url-routes';
import { UrlShortenerService } from './services/url-shortener-service';
import { MemoryUrlStore } from './store/memory-url-store';
import { UrlStore } from './types';

export interface AppOptions { port?: number; store?: UrlStore }

export function createApp(options: AppOptions = {}) {
  const port = options.port ?? getPort();
  const store = options.store ?? new MemoryUrlStore();
  const app = express();
  app.use(express.json());
  app.use(createUrlRouter(new UrlShortenerService(store, port)));
  app.use((_req: Request, res: Response) => res.status(404).json({ error: 'Not found' }));
  const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
    if (error instanceof SyntaxError && 'status' in error && error.status === 400) {
      res.status(400).json({ error: 'Invalid JSON body' });
      return;
    }
    if (res.headersSent) { next(error); return; }
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  };
  app.use(errorHandler);
  return app;
}
