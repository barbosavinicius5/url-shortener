import express, { Request, Response, NextFunction } from 'express';
import { UrlShortenerService } from './services/url-shortener-service';
import { UrlStore } from './store/url-store';
import { createUrlRoutes } from './routes/url-routes';
import { getPort } from './config';

export interface AppOptions {
  service?: UrlShortenerService;
  port?: number;
}

export function createApp(options?: AppOptions) {
  const store = new UrlStore();
  const service = options?.service ?? new UrlShortenerService(store);
  const port = options?.port ?? getPort();

  const app = express();

  // Body parser JSON — error handler for malformed JSON
  app.use(express.json());

  // Register URL routes
  app.use(createUrlRoutes(service));

  // 404 handler for unmatched routes
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Global error handler — catches JSON parse errors and unexpected errors
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    // Check for SyntaxError from body-parser (malformed JSON)
    if (err instanceof SyntaxError && 'body' in err && 'type' in err && (err as any).type === 'entity.parse.failed') {
      res.status(400).json({ error: 'Invalid JSON' });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return { app, port, service, store };
}