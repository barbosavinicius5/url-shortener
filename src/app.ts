import express from 'express';
import { InMemoryUrlStore } from './store/in-memory-url-store.js';
import { UrlShortenerService } from './services/url-shortener-service.js';
import { createUrlRoutes } from './routes/url-routes.js';

export function createApp(port: number = 3000): express.Express {
  const app = express();
  app.use(express.json());

  const store = new InMemoryUrlStore();
  const service = new UrlShortenerService(store, port);

  app.use(createUrlRoutes(service));

  return app;
}

// Default app for non-test usage (but server.ts handles startup)
const DEFAULT_PORT = 3000;
const app = createApp(DEFAULT_PORT);

export { app };