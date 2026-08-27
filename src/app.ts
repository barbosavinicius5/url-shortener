import express, { Request, Response, NextFunction } from 'express';
import { UrlStore } from './store/url-store';
import { UrlShortenerService } from './services/url-shortener-service';
import { createUrlRouter } from './routes/url-routes';

type AppOptions = { codeGenerator?: () => string };

export function createApp(port = 3000, options: AppOptions = {}): express.Express {
  const app = express();
  const store = new UrlStore();
  const service = new UrlShortenerService(store, `http://localhost:${port}`, options.codeGenerator);

  app.use(express.json());
  app.use(createUrlRouter(service));
  app.use((_req: Request, res: Response) => res.status(404).json({ error: 'Route not found' }));
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid request' });
  });
  return app;
}

export const app = createApp();