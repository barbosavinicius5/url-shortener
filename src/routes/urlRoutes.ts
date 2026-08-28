import { Router, type Request, type Response } from 'express';
import { InvalidUrlError, UrlShortenerService } from '../services/urlShortenerService.js';

export function createUrlRoutes(service: UrlShortenerService, baseUrl: string): Router {
  const router = Router();

  router.post('/shorten', (req: Request, res: Response): void => {
    const body: unknown = req.body;
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      res.status(400).json({ error: 'Request body must be an object containing a URL' });
      return;
    }

    try {
      const result = service.shorten((body as { url?: unknown }).url, baseUrl);
      res.status(201).json(result);
    } catch (error: unknown) {
      if (error instanceof InvalidUrlError) {
        res.status(400).json({ error: error.message });
        return;
      }
      throw error;
    }
  });

  router.get('/:code/stats', (req: Request<{ code: string }>, res: Response): void => {
    const stats = service.getStats(req.params.code);
    if (stats === undefined) {
      res.status(404).json({ error: 'Short URL not found' });
      return;
    }

    res.status(200).json(stats);
  });

  router.get('/:code', (req: Request<{ code: string }>, res: Response): void => {
    const record = service.redirect(req.params.code);
    if (record === undefined) {
      res.status(404).json({ error: 'Short URL not found' });
      return;
    }

    res.redirect(302, record.url);
  });

  return router;
}