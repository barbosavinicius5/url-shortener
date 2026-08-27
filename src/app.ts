import express, { ErrorRequestHandler } from 'express';
import { createShortenRouter } from './routes/shorten';
import { DEFAULT_PORT, UrlShortener } from './services/url-shortener';
import { UrlStore } from './store/url-store';

export function createApp(store = new UrlStore(), port = DEFAULT_PORT): express.Express {
  const app = express();
  app.use(express.json());
  app.use(createShortenRouter(new UrlShortener(store, port)));
  const jsonErrorHandler: ErrorRequestHandler = (_error, _req, res, _next) => {
    res.status(400).json({ error: 'invalid JSON body' });
  };
  app.use(jsonErrorHandler);
  return app;
}

export const app = createApp();