import express, { type Request, type Response, type NextFunction } from 'express';
import { createUrlRoutes } from './routes/url.routes.js';
import { UrlShortenerService } from './services/url-shortener.service.js';
import type { UrlStore } from './store/url.store.js';
import type { CodeGenerator } from './services/url-shortener.service.js';

export interface CreateAppOptions {
  store: UrlStore;
  codeGenerator?: CodeGenerator;
  port?: number;
}

export function createApp(options: CreateAppOptions): express.Application {
  const { store, codeGenerator, port = 3000 } = options;
  const baseUrl = `http://localhost:${port}`;

  const service = new UrlShortenerService(store, codeGenerator);
  const app = express();

  app.use(express.json());

  // Register routes
  const urlRoutes = createUrlRoutes(service, baseUrl);
  app.use(urlRoutes);

  // Centralized error handling for JSON parse errors and unexpected errors
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof SyntaxError && 'body' in err) {
      res.status(400).json({ error: 'Invalid JSON' });
      return;
    }
    console.error('Unexpected error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}