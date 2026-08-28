import express, {
  Express,
  ErrorRequestHandler,
  Request,
  Response,
} from 'express';
import { createUrlRouter } from './routes/url.routes';
import { UrlStore } from './store/url.store';
import { UrlShortenerService } from './services/url-shortener.service';

export interface AppOptions {
  /** TCP port used to assemble the local `shortUrl` base. */
  port: number;
  /** Optional store injection (one per app/test for isolation). */
  store?: UrlStore;
  /** Optional service injection. */
  service?: UrlShortenerService;
}

/**
 * Compose the Express application. This module MUST NOT call `listen` — that is
 * the sole responsibility of `server.ts` — so tests can obtain an app without
 * opening a real port.
 */
export function createApp(options: AppOptions): Express {
  const store = options.store ?? new UrlStore();
  const service = options.service ?? new UrlShortenerService(store);
  const baseUrl = `http://localhost:${options.port}`;

  const app = express();
  app.use(express.json());

  app.use(createUrlRouter(service, baseUrl));

  // Final 404 for any unrecognized route, always JSON (never HTML).
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
  });

  // JSON error handler: malformed JSON (and any other error) returns JSON.
  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    const status = (err as { status?: number }).status ?? 500;
    if (err instanceof SyntaxError && status === 400) {
      res.status(400).json({ error: 'Invalid JSON body' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  };
  app.use(errorHandler);

  return app;
}