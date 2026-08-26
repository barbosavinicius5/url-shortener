import express, { ErrorRequestHandler } from 'express';
import { createShortenerRouter } from './routes/shortener.routes';
import { InMemoryUrlStore } from './store/in-memory-url.store';
import { UrlShortenerService } from './services/url-shortener.service';
import { resolvePort } from './config';

export function createApp(port = resolvePort()): express.Express {
  const app = express();
  const service = new UrlShortenerService(new InMemoryUrlStore());
  app.use(express.json());
  app.use(createShortenerRouter(service, port));
  app.use((req, res) => res.status(404).json({ error: 'Not found' }));
  const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
    if (error instanceof SyntaxError && 'body' in error) {
      res.status(400).json({ error: 'Malformed JSON' });
      return;
    }
    next(error);
  };
  app.use(errorHandler);
  return app;
}

export const app = createApp();