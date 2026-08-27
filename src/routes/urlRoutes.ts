import { Router, type Request, type Response } from 'express';
import type { UrlService } from '../services/urlService.js';

export function urlRoutes(urlService: UrlService): Router {
  const router = Router();

  // POST /shorten
  router.post('/shorten', (req: Request, res: Response) => {
    const body = req.body as unknown;
    const urlValue = body && typeof body === 'object' ? (body as Record<string, unknown>).url : undefined;
    const error = urlService.validateUrl(urlValue);
    if (error) {
      res.status(400).json({ error });
      return;
    }
    const result = urlService.createShortUrl(urlValue as string);
    res.status(201).json(result);
  });

  // GET /:code/stats (must be before /:code)
  router.get('/:code/stats', (req: Request, res: Response) => {
    const stats = urlService.getStats(req.params.code);
    if (!stats) {
      res.status(404).json({ error: 'Short code not found' });
      return;
    }
    res.status(200).json(stats);
  });

  // GET /:code
  router.get('/:code', (req: Request, res: Response) => {
    const record = urlService.redirect(req.params.code);
    if (!record) {
      res.status(404).json({ error: 'Short code not found' });
      return;
    }
    res.redirect(302, record.url);
  });

  return router;
}