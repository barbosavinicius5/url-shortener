import { Router, type Request, type Response } from 'express';
import type { UrlShortenerService } from '../services/url-shortener.service.js';

export function createUrlRoutes(service: UrlShortenerService, baseUrl: string): Router {
  const router = Router();

  // POST /shorten - Create a short URL
  router.post('/shorten', (req: Request, res: Response) => {
    const body = req.body;

    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
      res.status(400).json({ error: 'Invalid URL' });
      return;
    }

    const url = (body as Record<string, unknown>).url;
    const validationError = service.validateUrl(url);

    if (validationError) {
      res.status(400).json(validationError);
      return;
    }

    const result = service.createShortUrl(url as string, baseUrl);
    res.status(201).json(result);
  });

  // GET /:code/stats - Get statistics (must be before /:code to avoid "stats" being treated as a code)
  router.get('/:code/stats', (req: Request, res: Response) => {
    const code = String(req.params.code);
    const stats = service.getStats(code);

    if (!stats) {
      res.status(404).json({ error: 'Short URL not found' });
      return;
    }

    res.status(200).json(stats);
  });

  // GET /:code - Redirect to original URL
  router.get('/:code', (req: Request, res: Response) => {
    const code = String(req.params.code);
    const record = service.incrementHits(code);

    if (!record) {
      res.status(404).json({ error: 'Short URL not found' });
      return;
    }

    res.redirect(302, record.url);
  });

  return router;
}