import express, { Request, Response, NextFunction } from 'express';
import { InMemoryLinkStore } from './store/in-memory-link-store';
import { UrlShortenerService } from './services/url-shortener-service';
import { registerRoutes } from './http/routes';

export interface AppOptions {
  store?: InMemoryLinkStore;
  service?: UrlShortenerService;
}

export function createApp(options?: AppOptions) {
  const store = options?.store ?? new InMemoryLinkStore();
  const service = options?.service ?? new UrlShortenerService(store);

  const app = express();

  // Parse JSON bodies with error handling for malformed JSON
  app.use(express.json());

  // Register all routes
  const router = express.Router();
  registerRoutes(router, service);
  app.use(router);

  // Global error handler (must have 4 params)
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    // Syntactic error from express.json() (SyntaxError)
    if (err instanceof SyntaxError && 'body' in err) {
      res.status(400).json({ error: 'Invalid JSON in request body.' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  });

  return { app, store, service };
}