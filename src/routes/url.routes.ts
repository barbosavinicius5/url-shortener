import { Router, Request, Response, NextFunction } from 'express';
import { UrlShortenerService } from '../services/url-shortener.service';

export function createUrlRoutes(service: UrlShortenerService): Router {
  const router = Router();

  router.post('/shorten', (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as unknown;
      const url = body && typeof body === 'object' && 'url' in body
        ? (body as Record<string, unknown>).url
        : undefined;

      if (!service.isValidUrl(url)) {
        return res.status(400).json({ error: 'Invalid URL. Must start with http:// or https://' });
      }

      const baseUrl = req.app.get('baseUrl') as string;
      const result = service.createShortUrl(url as string, baseUrl);
      return res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.get('/:code/stats', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code } = req.params;
      const stats = service.getStats(code);
      if (!stats) {
        return res.status(404).json({ error: 'Code not found' });
      }
      return res.status(200).json(stats);
    } catch (error) {
      next(error);
    }
  });

  router.get('/:code', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code } = req.params;
      const url = service.redirect(code);
      if (!url) {
        return res.status(404).json({ error: 'Code not found' });
      }
      return res.redirect(302, url);
    } catch (error) {
      next(error);
    }
  });

  return router;
}