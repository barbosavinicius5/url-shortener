import express from 'express';
import { InMemoryUrlStore } from './store/in-memory-url-store';
import { UrlShortenerService } from './services/url-shortener-service';
import { createUrlRouter } from './routes/url-routes';
import { getPort, getShortUrlBase } from './config';

export interface AppOptions {
  port?: number;
  store?: InMemoryUrlStore;
}

export function createApp(options?: AppOptions) {
  const port = options?.port ?? getPort();
  const store = options?.store ?? new InMemoryUrlStore();
  const service = new UrlShortenerService(store);
  const shortUrlBase = getShortUrlBase(port);

  const app = express();
  app.use(express.json());
  app.use('/', createUrlRouter(service, shortUrlBase));

  return app;
}

// Convenience instance for server startup
export const app = createApp();