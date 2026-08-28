import express, { type NextFunction, type Request, type Response } from 'express';
import { getBaseUrl, getPort } from './config.js';
import { createUrlRoutes } from './routes/urlRoutes.js';
import { UrlShortenerService } from './services/urlShortenerService.js';
import { UrlStore } from './store/urlStore.js';

export function createApp(
  service: UrlShortenerService = new UrlShortenerService(new UrlStore()),
  baseUrl: string = getBaseUrl(getPort()),
) {
  const app = express();
  app.use(express.json());
  app.use(createUrlRoutes(service, baseUrl));
  app.use((error: unknown, _req: Request, res: Response, next: NextFunction): void => {
    const parseError = error as { type?: string };
    if (parseError.type === 'entity.parse.failed') {
      res.status(400).json({ error: 'Request body must contain valid JSON' });
      return;
    }
    next(error);
  });
  return app;
}