import { Router } from 'express';
import type { UrlShortenerService } from '../services/url-shortener-service.js';

export function createRedirectRoutes(service: UrlShortenerService): Router {
  const router = Router();

  // MUST be registered before /:code so "stats" is not caught as a code
  router.get('/:code/stats', (req, res) => {
    const { code } = req.params;
    const result = service.getStats(code);

    if (!result.ok) {
      res.status(404).json({ error: 'short URL not found' });
      return;
    }

    res.status(200).json(result.value);
  });

  router.get('/:code', (req, res) => {
    const { code } = req.params;
    const result = service.resolve(code);

    if (!result.ok) {
      res.status(404).json({ error: 'short URL not found' });
      return;
    }

    res.redirect(302, result.value.url);
  });

  return router;
}