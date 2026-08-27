import express, { Request, Response, NextFunction } from 'express';
import { InMemoryUrlStore } from './store/inMemoryUrlStore';
import { createShortenRoutes } from './routes/shortenRoutes';
import { UrlStore } from './types/url';

export function createApp(store?: UrlStore): express.Application {
  const app = express();
  const activeStore = store ?? new InMemoryUrlStore();

  // JSON body parser — must be before routes
  app.use(express.json());

  // Handle malformed JSON
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction): void => {
    if (err instanceof SyntaxError && 'body' in err) {
      res.status(400).json({ error: 'Invalid JSON body' });
      return;
    }
    // Pass through to default Express error handler
    _next(err);
  });

  // Mount routes
  app.use('/', createShortenRoutes(activeStore));

  return app;
}