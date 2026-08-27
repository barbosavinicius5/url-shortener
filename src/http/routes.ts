import { Router, type Request, type Response } from 'express';

import {
  InvalidUrlError,
  ShortUrlNotFoundError,
  UrlShortenerService,
} from '../services/url-shortener-service';

export function createRouter(service: UrlShortenerService): Router {
  const router = Router();

  // POST /shorten — creates a new short URL.
  router.post('/shorten', (req: Request, res: Response) => {
    const body = req.body;
    const url = body && typeof body === 'object' ? (body as { url?: unknown }).url : undefined;

    try {
      const created = service.createShortUrl(url);
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof InvalidUrlError) {
        res.status(400).json({ error: err.message });
        return;
      }
      throw err;
    }
  });

  // NOTE: /:code/stats must be declared BEFORE /:code so that
  // "stats" is not captured as a short code.
  router.get('/:code/stats', (req: Request, res: Response) => {
    try {
      const stats = service.getStats(req.params.code as string);
      res.status(200).json(stats);
    } catch (err) {
      if (err instanceof ShortUrlNotFoundError) {
        res.status(404).json({ error: err.message });
        return;
      }
      throw err;
    }
  });

  // GET /:code — redirects to the original URL and counts the hit.
  router.get('/:code', (req: Request, res: Response) => {
    try {
      const target = service.redirectTarget(req.params.code as string);
      res.redirect(302, target);
    } catch (err) {
      if (err instanceof ShortUrlNotFoundError) {
        res.status(404).json({ error: err.message });
        return;
      }
      throw err;
    }
  });

  return router;
}

/**
 * Final error middleware: malformed JSON bodies and unexpected errors
 * are converted into controlled JSON error responses.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: unknown,
): void {
  const isBodyParserError =
    typeof err === 'object' && err !== null && 'type' in err &&
    (err as { type?: string }).type === 'entity.parse.failed';

  if (isBodyParserError) {
    res.status(400).json({ error: 'Malformed JSON body' });
    return;
  }

  res.status(500).json({ error: 'Internal server error' });
}