import express from 'express';
import { UrlShortenerService } from './services/url-shortener-service';
import { InMemoryUrlStore } from './store/in-memory-url-store';
import { createUrlRoutes } from './routes/url-routes';

export function createApp(port: number): { app: express.Express; store: InMemoryUrlStore } {
  const store = new InMemoryUrlStore();
  const service = new UrlShortenerService(store, { port });
  const app = express();

  app.use(express.json());

  const urlRoutes = createUrlRoutes(service);
  app.use(urlRoutes);

  // 404 handler — JSON response
  app.use((_req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });

  // Error handler — JSON invalid and unexpected errors
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof SyntaxError && 'body' in err) {
      res.status(400).json({ error: 'Invalid JSON' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  });

  return { app, store };
}