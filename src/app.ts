import express from 'express';
import { InMemoryUrlStore } from './store/in-memory-url-store';
import { UrlShortenerService } from './services/url-shortener-service';
import { createUrlRoutes } from './routes/url-routes';

export function createApp(port: number): express.Express {
  const app = express();

  app.use(express.json());

  const store = new InMemoryUrlStore();
  const service = new UrlShortenerService(store, port);
  const urlRoutes = createUrlRoutes(service);

  app.use('/', urlRoutes);

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (
      err !== null &&
      typeof err === 'object' &&
      'status' in err &&
      (err as { status: number }).status === 400
    ) {
      res.status(400).json({ error: 'Invalid JSON payload' });
      return;
    }
    if (
      err !== null &&
      typeof err === 'object' &&
      'type' in err &&
      (err as { type: string }).type === 'entity.parse.failed'
    ) {
      res.status(400).json({ error: 'Invalid JSON payload' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}