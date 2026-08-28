import express, { Express } from 'express';
import { createRedirectRouter } from './routes/redirect';
import { createShortenRouter } from './routes/shorten';
import { UrlShortenerService } from './services/url-shortener.service';
import { UrlStore } from './storage/url-store';

export interface AppOptions {
  port?: number;
  store?: UrlStore;
}

export function createApp(options: AppOptions = {}): Express {
  const app = express();
  const store = options.store ?? new UrlStore();
  const service = new UrlShortenerService(store, options.port ?? 3000);
  app.use(express.json());
  app.use(createShortenRouter(service));
  app.use(createRedirectRouter(service));
  return app;
}