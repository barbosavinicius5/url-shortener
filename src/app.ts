import express, { type ErrorRequestHandler, type Express, type Request, type Response } from 'express';
import { RedirectController } from './controllers/redirect.controller';
import { ShortenController } from './controllers/shorten.controller';
import { createRedirectRouter } from './routes/redirect.routes';
import { createShortenRouter } from './routes/shorten.routes';
import { UrlShortenerService } from './services/url-shortener.service';
import { LinkStore } from './store/link.store';

export const DEFAULT_PORT = 3000;

export function resolvePort(value: string | undefined = process.env.PORT): number {
  if (value === undefined || !/^[0-9]+$/.test(value)) return DEFAULT_PORT;
  const port = Number(value);
  return Number.isInteger(port) && port > 0 && port <= 65535 ? port : DEFAULT_PORT;
}

export function createApp(port: number = resolvePort(), store: LinkStore = new LinkStore()): Express {
  const app = express();
  const service = new UrlShortenerService(store, port);
  const shortenController = new ShortenController(service);
  const redirectController = new RedirectController(service);

  app.use(express.json());
  app.use(createShortenRouter(shortenController));
  app.use(createRedirectRouter(redirectController));
  app.use((_req: Request, res: Response): void => {
    res.status(404).json({ error: 'Not found' });
  });
  const errorHandler: ErrorRequestHandler = (_error, _req, res, _next): void => {
    res.status(500).json({ error: 'Internal server error' });
  };
  app.use(errorHandler);
  return app;
}