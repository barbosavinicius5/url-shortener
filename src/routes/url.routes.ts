import { Router, Request, Response } from 'express';
import { UrlShortenerService, UrlValidationError } from '../services/url-shortener.service';
import { ShortenBody } from '../types/url';

export function createUrlRouter(service: UrlShortenerService): Router {
  const router = Router();

  router.post('/shorten', (req: Request, res: Response) => {
    const body: unknown = req.body;
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      res.status(400).json({ error: 'Invalid JSON body' });
      return;
    }

    try {
      const result = service.createShortUrl((body as ShortenBody).url);
      res.status(201).json(result);
    } catch (err) {
      if (err instanceof UrlValidationError) {
        res.status(400).json({ error: err.message });
        return;
      }
      throw err;
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
    const redirect = service.getRedirect(req.params.code);
    if (!redirect) {
      res.status(404).json({ error: 'Short URL not found' });
      return;
    }
    res.redirect(302, redirect.url);
  });

  return router;
}