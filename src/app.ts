import express, { ErrorRequestHandler } from 'express';
import { createUrlRouter } from './routes/url.routes';
import { UrlShortenerService } from './domain/url-shortener.service';
import { UrlStore } from './store/url.store';

export interface AppOptions { publicBaseUrl?: string }

export function createApp(options: AppOptions = {}) {
  const app = express();
  const service = new UrlShortenerService(new UrlStore(), options.publicBaseUrl ?? 'http://localhost:3000');
  app.use(express.json());
  app.use('/', createUrlRouter(service));
  const errorHandler: ErrorRequestHandler = (_error, _req, res, _next) => {
    res.status(500).json({ error: 'Internal server error' });
  };
  app.use(errorHandler);
  return app;
}