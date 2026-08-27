import { Router, Request, Response } from 'express';
import { UrlShortenerService } from '../services/url-shortener-service';

function getCode(req: Request): string {
  const code = req.params.code;
  return Array.isArray(code) ? code[0] : code;
}

export function createUrlRouter(service: UrlShortenerService): Router {
  const router = Router();

  router.post('/shorten', (req: Request, res: Response) => {
    try {
      const result = service.shortenUrl(req.body?.url);
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof Error && error.message === 'Unable to generate a unique code') {
        res.status(500).json({ error: 'Unable to generate a unique code' });
        return;
      }
      res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid URL' });
    }
  });

  router.get('/:code/stats', (req: Request, res: Response) => {
    const stats = service.getStats(getCode(req));
    if (!stats) {
      res.status(404).json({ error: 'Short code not found' });
      return;
    }
    res.status(200).json(stats);
  });

  router.get('/:code', (req: Request, res: Response) => {
    const record = service.redirectByCode(getCode(req));
    if (!record) {
      res.status(404).json({ error: 'Short code not found' });
      return;
    }
    res.redirect(302, record.url);
  });

  return router;
}