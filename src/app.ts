import express, { Express } from 'express';
import { getPort } from './config';
import { createUrlRouter } from './routes/url-routes';
import { InMemoryUrlStore } from './storage/in-memory-url-store';
import { UrlShortenerService } from './services/url-shortener-service';

export interface AppOptions {
  port?: number;
}

export function createApp(options: AppOptions = {}): Express {
  const app = express();
  const store = new InMemoryUrlStore();
  const port = options.port ?? getPort();
  const service = new UrlShortenerService(store, port);

  app.use(express.json());
  app.use('/', createUrlRouter(service));

  return app;
}

export const app = createApp();