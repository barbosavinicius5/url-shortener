import { Router, type Request, type Response } from 'express';
import { InvalidUrlError, UrlShortenerService } from '../services/url-shortener-service.js';
import type { ErrorResponse, ShortenRequest } from '../types/url.js';

export function createUrlRouter(service: UrlShortenerService, baseUrl: string): Router {
  const router = Router();

  router.post('/shorten', (req: Request, res: Response) => {
    const body = req.body as ShortenRequest | undefined;
    try {
      const result = service.createShortUrl(body?.url);
      res.status(201).json({ code: result.code, shortUrl: `${baseUrl}/${result.code}` });
    } catch (error) {
      if (error instanceof InvalidUrlError) {
        const response: ErrorResponse = { error: error.message };
        res.status(400).json(response);
        return;
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.get('/:code/stats', (req: Request, res: Response) => {
    const stats = service.getStats(req.params.code);
    if (!stats) {
      res.status(404).json({ error: 'Short URL not found' });
      return;
    }
    res.status(200).json(stats);
  });

  router.get('/:code', (req: Request, res: Response) => {
    const record = service.redirect(req.params.code);
    if (!record) {
      res.status(404).json({ error: 'Short URL not found' });
      return;
    }
    res.redirect(302, record.url);
  });

  return router;
}