import express, { type Express } from 'express';
import { UrlShortenerService } from './services/url-shortener-service.js';
import { UrlStore } from './store/url-store.js';
import { createUrlRouter } from './routes/url-routes.js';

export interface AppOptions {
  service?: UrlShortenerService;
  baseUrl: string;
}

export function createApp(options: AppOptions): Express {
  const service = options.service ?? new UrlShortenerService(new UrlStore());
  const app = express();
  app.use(express.json());
  app.use(createUrlRouter(service, options.baseUrl.replace(/\/$/, '')));
  app.use((_error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    response.status(400).json({ error: 'Invalid JSON body' });
  });
  return app;
}

export const app = createApp({ baseUrl: 'http://localhost:3000' });