import { Router } from 'express';
import type { UrlShortenerService } from '../services/url-shortener-service.js';

export function createShortenRoutes(service: UrlShortenerService): Router {
  const router = Router();

  router.post('/shorten', (req, res) => {
    const body = req.body as Record<string, unknown> | undefined;
    const url = body?.url;
    const result = service.create(url);

    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.status(201).json(result.value);
  });

  return router;
}