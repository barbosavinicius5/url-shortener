import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from 'express';

import { InMemoryUrlStore } from './stores/in-memory-url.store';
import { UrlShortenerService } from './services/url-shortener.service';
import { createShortenRouter } from './routes/shorten.routes';
import { createUrlRouter } from './routes/url.routes';

/**
 * Wires up the dependency graph and returns an Express application.
 *
 * This function never calls `listen`, so it is safe to use in tests without
 * opening a socket or occupying a port.
 *
 * @param store Optional store instance. A fresh one is created by default so
 *   each application instance is isolated.
 */
export function createApp(
  store: InMemoryUrlStore = new InMemoryUrlStore(),
): Express {
  const app = express();
  const service = new UrlShortenerService(store);

  app.use(express.json());

  // Order matters: `/shorten` must precede the generic `/:code` router.
  app.use(createShortenRouter(service));
  app.use(createUrlRouter(service));

  // Final handler for unmatched routes -> JSON 404.
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Route not found' });
  });

  // Global error handler -> JSON 400/500 without leaking stack traces.
  app.use(
    (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
      if (res.headersSent) {
        return;
      }

      const error =
        err && typeof err === 'object' ? (err as { type?: string }) : {};

      if (error.type === 'entity.parse.failed') {
        res.status(400).json({ error: 'Invalid JSON body' });
        return;
      }

      res.status(500).json({ error: 'Internal server error' });
    },
  );

  return app;
}