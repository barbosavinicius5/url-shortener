import express, { Request, Response, NextFunction } from 'express';
import { InMemoryUrlStore } from './store/inMemoryUrlStore';
import { UrlShortenerService } from './services/urlShortenerService';
import { createUrlRoutes } from './routes/urlRoutes';
import { resolveConfig } from './config';

export function createApp(configOverride?: { port: number; baseUrl: string }) {
  const config = configOverride || resolveConfig();
  const store = new InMemoryUrlStore();
  const service = new UrlShortenerService(store, config.baseUrl);
  const app = express();

  app.use(express.json());

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    if (err.type === 'entity.parse.failed') {
      res.status(400).json({ error: 'Invalid JSON body' });
      return;
    }
    next(err);
  });

  const urlRoutes = createUrlRoutes(service);
  app.use(urlRoutes);

  app.use((req: Request, res: Response) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unexpected error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return { app, store, config };
}