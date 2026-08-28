import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import type { UrlShortenerService } from './services/url-shortener.service.js';
import { createShortenerRouter } from './routes/shortener.js';

/**
 * Application factory. Receives its dependencies explicitly so every test can
 * build an isolated instance. Does not start a listener — that is `server.ts`'s job.
 */
export function createApp(service: UrlShortenerService): Express {
  const app = express();

  app.use(express.json());
  app.use(createShortenerRouter(service));

  // Keeps error responses as JSON: a malformed JSON body would otherwise
  // produce the default (HTML) Express error page.
  app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
    if (isJsonParseError(error)) {
      response.status(400).json({ error: 'Malformed JSON body.' });
      return;
    }

    response.status(500).json({ error: 'Internal server error.' });
  });

  return app;
}

function isJsonParseError(error: unknown): boolean {
  return (
    error instanceof SyntaxError &&
    'status' in error &&
    (error as { status?: unknown }).status === 400
  );
}