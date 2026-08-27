import { Router } from 'express';
import { InvalidUrlError, UrlShortenerService } from '../domain/url-shortener.service';

export function createUrlRouter(service: UrlShortenerService): Router {
  const router = Router();
  router.post('/shorten', (req, res, next) => {
    try {
      const body: unknown = req.body;
      const url = typeof body === 'object' && body !== null && 'url' in body
        ? (body as { url?: unknown }).url
        : undefined;
      res.status(201).json(service.create(url));
    } catch (error) {
      if (error instanceof InvalidUrlError) {
        res.status(400).json({ error: error.message });
        return;
      }
      next(error);
    }
  });
  router.get('/:code/stats', (req, res) => {
    const stats = service.getStats(req.params.code);
    if (!stats) {
      res.status(404).json({ error: 'Short code not found' });
      return;
    }
    res.status(200).json(stats);
  });
  router.get('/:code', (req, res) => {
    const record = service.resolveAndCount(req.params.code);
    if (!record) {
      res.status(404).json({ error: 'Short code not found' });
      return;
    }
    res.redirect(302, record.url);
  });
  return router;
}