import { Router, Request, Response } from 'express';
import { UrlShortenerService } from '../services/urlShortenerService';

export function createUrlRoutes(service: UrlShortenerService): Router {
  const router = Router();

  router.post('/shorten', (req: Request, res: Response) => {
    const body = req.body;

    if (!body || typeof body !== 'object') {
      res.status(400).json({ error: 'Invalid request body' });
      return;
    }

    if (typeof body.url !== 'string') {
      res.status(400).json({ error: 'URL is required and must be a string' });
      return;
    }

    const url = body.url;
    if (!url) {
      res.status(400).json({ error: 'URL is required' });
      return;
    }

    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        res.status(400).json({ error: 'URL must use http or https protocol' });
        return;
      }
    } catch {
      res.status(400).json({ error: 'Invalid URL format' });
      return;
    }

    try {
      const result = service.shortenUrl(url);
      res.status(201).json(result);
    } catch {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.get('/:code/stats', (req: Request, res: Response) => {
    const { code } = req.params;
    const stats = service.getStats(code);
    if (!stats) {
      res.status(404).json({ error: 'URL not found' });
      return;
    }
    res.json(stats);
  });

  router.get('/:code', (req: Request, res: Response) => {
    const { code } = req.params;
    const record = service.redirect(code);
    if (!record) {
      res.status(404).json({ error: 'URL not found' });
      return;
    }
    res.redirect(302, record.url);
  });

  return router;
}