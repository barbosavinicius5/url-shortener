import { Router, Request, Response } from 'express';
import { UrlShortenerService } from '../services/url-shortener.service';

export function createRedirectRouter(service: UrlShortenerService): Router {
  const router = Router();
  router.get('/:code/stats', (req: Request, res: Response) => {
    const code = typeof req.params.code === 'string' ? req.params.code : '';
    const stats = service.getStats(code);
    if (!stats) {
      res.status(404).json({ error: 'Short URL not found' });
      return;
    }
    res.status(200).json(stats);
  });
  router.get('/:code', (req: Request, res: Response) => {
    const code = typeof req.params.code === 'string' ? req.params.code : '';
    const originalUrl = service.redirect(code);
    if (!originalUrl) {
      res.status(404).json({ error: 'Short URL not found' });
      return;
    }
    res.redirect(302, originalUrl);
  });
  return router;
}