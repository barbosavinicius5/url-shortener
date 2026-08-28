import express, { Express, NextFunction, Request, Response } from 'express';
import { getPort, getBaseUrl } from './config/env';
import { InMemoryUrlStore } from './storage/in-memory-url.store';
import { UrlShortenerService } from './services/url-shortener.service';
import { createShorteningRoutes } from './routes/shortening.routes';
import { AppConfig } from './types/url.types';

export interface CreateAppDependencies {
  store?: InMemoryUrlStore;
  config?: Partial<AppConfig>;
}

/**
 * Builds the Express application without opening a socket, so tests can
 * exercise it with Supertest and local usage can `listen` in server.ts.
 */
export function createApp(
  store: InMemoryUrlStore = new InMemoryUrlStore(),
  config: Partial<AppConfig> = {}
): Express {
  const port = config.port ?? getPort();
  const service = new UrlShortenerService(store, getBaseUrl(port));

  const app = express();

  app.use(express.json());

  app.use('/', createShorteningRoutes(service));

  // Unknown paths that are not codes or routes.
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Centralized error handler: malformed JSON and unexpected failures must
  // never leak stack traces.
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (
      typeof error === 'object' &&
      error !== null &&
      'type' in error &&
      (error as { type?: string }).type === 'entity.parse.failed'
    ) {
      res.status(400).json({ error: 'Invalid JSON body' });
      return;
    }

    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}