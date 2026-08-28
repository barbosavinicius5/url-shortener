import { Router } from 'express';
import type { UrlShortenerService } from '../services/url-shortener.service.js';

/**
 * Builds the router with the three shortener endpoints.
 * Translates inputs and service results into HTTP statuses and JSON bodies.
 */
export function createShortenerRouter(service: UrlShortenerService): Router {
  const router = Router();

  router.post('/shorten', (req, res) => {
    const body: unknown = req.body;
    const result = service.createShortUrl(extractUrlFromBody(body));

    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.status(201).json(result.response);
  });

  // Registered before `GET /:code` so `stats` is never treated as a short code.
  router.get('/:code/stats', (req, res) => {
    const stats = service.getStats(req.params.code);

    if (stats === undefined) {
      res.status(404).json({ error: `No short URL found for code "${req.params.code}".` });
      return;
    }

    res.status(200).json(stats);
  });

  router.get('/:code', (req, res) => {
    const record = service.resolveForRedirect(req.params.code);

    if (record === undefined) {
      res.status(404).json({ error: `No short URL found for code "${req.params.code}".` });
      return;
    }

    res.redirect(302, record.url);
  });

  return router;
}

/** Safely extracts the untrusted `url` field from an untrusted request body. */
function extractUrlFromBody(body: unknown): unknown {
  if (body === null || typeof body !== 'object') {
    return undefined;
  }

  return (body as { url?: unknown }).url;
}