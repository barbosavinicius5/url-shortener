import { Router, type Request, type Response } from 'express';

import { UrlShortenerService } from '../services/url-shortener.service';

/**
 * Builds the redirect + stats routers for a given service instance.
 *
 * IMPORTANT: the `/:code/stats` route MUST be registered before the generic
 * `/:code` route so that `stats` is never interpreted as a short code.
 */
export function createUrlRouter(service: UrlShortenerService): Router {
  const router = Router();

  router.get('/:code/stats', (req: Request, res: Response) => {
    const code = String(req.params.code);
    const stats = service.getStats(code);
    if (!stats) {
      res.status(404).json({ error: 'Short URL not found' });
      return;
    }
    res.status(200).json(stats);
  });

  router.get('/:code', (req: Request, res: Response) => {
    const code = String(req.params.code);
    const record = service.redirect(code);
    if (!record) {
      res.status(404).json({ error: 'Short URL not found' });
      return;
    }
    res.redirect(302, record.url);
  });

  return router;
}