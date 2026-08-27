import { Router, Request, Response } from 'express';
import { UrlShortener } from '../services/url-shortener';

export function createShortenRouter(service: UrlShortener): Router {
  const router = Router();
  router.post('/shorten', (req: Request, res: Response) => {
    try {
      const result = service.createShortening((req.body as { url?: unknown } | undefined)?.url);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'invalid request' });
    }
  });
  router.get('/:code/stats', (req: Request, res: Response) => {
    const result = service.getStats(req.params.code ?? '');
    if (!result) { res.status(404).json({ error: 'short code not found' }); return; }
    res.status(200).json(result);
  });
  router.get('/:code', (req: Request, res: Response) => {
    const url = service.redirectByCode(req.params.code ?? '');
    if (!url) { res.status(404).json({ error: 'short code not found' }); return; }
    res.redirect(302, url);
  });
  return router;
}