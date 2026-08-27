import { Router, Request, Response } from 'express';
import { UrlShortenerService } from '../services/url-shortener-service';

export function createUrlRoutes(service: UrlShortenerService): Router {
  const router = Router();

  // POST /shorten
  router.post('/shorten', (req: Request, res: Response) => {
    const body = req.body as unknown;
    if (typeof body !== 'object' || body === null || !('url' in body)) {
      res.status(400).json({ error: 'Missing required field: url' });
      return;
    }

    const { url } = body as Record<string, unknown>;

    if (!service.validateUrl(url)) {
      res.status(400).json({ error: 'Invalid URL. URL must start with http:// or https://' });
      return;
    }

    const result = service.createShortUrl(url);
    res.status(201).json(result);
  });

  // GET /:code/stats — must be registered before GET /:code
  router.get('/:code/stats', (req: Request, res: Response) => {
    const { code } = req.params;
    const stats = service.getStats(code);
    if (!stats) {
      res.status(404).json({ error: 'Code not found' });
      return;
    }
    res.status(200).json({ code: stats.code, url: stats.url, hits: stats.hits });
  });

  // GET /:code
  router.get('/:code', (req: Request, res: Response) => {
    const { code } = req.params;
    const record = service.redirect(code);
    if (!record) {
      res.status(404).json({ error: 'Code not found' });
      return;
    }
    res.redirect(302, record.url);
  });

  return router;
}