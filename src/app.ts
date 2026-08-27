import express, { Express } from 'express';
import { UrlStore } from './store/url.store';
import { UrlService } from './services/url.service';
import { createShortenerRouter } from './routes/shortener.routes';
import { errorHandler } from './http/error-handler';

export function createApp(store: UrlStore = new UrlStore(), port = 3000): Express {
  const app = express();
  app.use(express.json());
  app.use(createShortenerRouter(new UrlService(store, port)));
  app.use(errorHandler);
  return app;
}