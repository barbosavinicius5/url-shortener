import { Router, Request, Response } from 'express';
import { UrlShortenerService } from '../services/url-shortener-service';

type UrlBody = { url?: unknown };

export function createUrlRouter(service: UrlShortenerService): Router {
  const router = Router();
  router.post('/shorten', (req: Request<Record<string, never>, unknown, UrlBody>, res: Response) => {
    try {
      const result = service.create(req.body?.url);
      res.status(201).json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid URL';
      res.status(400).json({ error: message || 'Invalid URL' });
    }
  });
  router.get('/:code/stats', (req: Request<{ code: string }>, res: Response) => {
    const entry = service.getStats(req.params.code);
    if (!entry) { res.status(404).json({ error: 'Short URL not found' }); return; }
    res.status(200).json(entry);
  });
  router.get('/:code', (req: Request<{ code: string }>, res: Response) => {
    const entry = service.redirect(req.params.code);
    if (!entry) { res.status(404).json({ error: 'Short URL not found' }); return; }
    res.redirect(302, entry.url);
  });
  return router;
}
