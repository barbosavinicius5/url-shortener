import express, { Application, Request, Response, NextFunction } from 'express';
import { LinkStore } from './store/link-store.js';
import { UrlShortenerService } from './services/url-shortener-service.js';
import { createShortenRoutes } from './routes/shorten-routes.js';
import { getPort } from './config.js';

interface AppOptions {
  port?: number;
  store?: LinkStore;
}

export function createApp(options?: AppOptions): Application {
  const port = options?.port ?? getPort();
  const store = options?.store ?? new LinkStore();
  const service = new UrlShortenerService(store);
  const baseUrl = `http://localhost:${port}`;

  const app: Application = express();

  // Parse JSON bodies
  app.use(express.json());

  // Mount routes
  app.use(createShortenRoutes(service, baseUrl));

  // 404 for unmatched routes
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Error handler for JSON parse errors (SyntaxError)
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof SyntaxError && 'body' in err) {
      res.status(400).json({ error: 'Invalid JSON in request body' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}