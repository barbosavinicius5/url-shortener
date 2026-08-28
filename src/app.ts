import express, { ErrorRequestHandler, Express } from 'express';
import { UrlStore } from './store/url.store';
import { ShortenerService, CodeGenerator } from './services/shortener.service';
import { createShortenerRouter } from './routes/shortener.routes';

export function resolvePort(value: string | undefined = process.env.PORT): number {
  const port = Number(value || 3000);
  return Number.isInteger(port) && port > 0 && port <= 65535 ? port : 3000;
}

export function createApp(store = new UrlStore(), port = resolvePort(), codeGenerator?: CodeGenerator): Express {
  const app = express();
  const service = new ShortenerService(store, codeGenerator);
  app.use(express.json());
  app.use(createShortenerRouter(service, port));

  const jsonErrorHandler: ErrorRequestHandler = (error, _req, res, next) => {
    if (error instanceof SyntaxError && 'body' in error) {
      res.status(400).json({ error: 'Invalid JSON' });
      return;
    }
    next(error);
  };
  app.use(jsonErrorHandler);
  return app;
}

export const app = createApp();