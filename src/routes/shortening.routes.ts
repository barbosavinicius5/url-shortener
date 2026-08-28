import { NextFunction, Request, Response, Router } from 'express';
import {
  CodeGenerationError,
  InvalidBodyError,
  InvalidUrlError,
  NotFoundError,
  UrlShortenerService
} from '../services/url-shortener.service';

/** Express route params may be typed as string | string[]; the contract here is a single code. */
function toCode(raw: string | string[]): string {
  return Array.isArray(raw) ? raw[0] : raw;
}

/**
 * HTTP contracts:
 * - POST /shorten      -> 201 { code, shortUrl } | 400 { error }
 * - GET /:code/stats   -> 200 { code, url, hits } | 404 { error }
 * - GET /:code         -> 302 Location | 404 { error }
 *
 * Note: the stats route must be registered before the redirect route so
 * "stats" is never treated as a short code.
 */
export function createShorteningRoutes(service: UrlShortenerService): Router {
  const router = Router();

  router.post('/shorten', (req: Request, res: Response) => {
    try {
      const result = service.shorten(req.body);
      res.status(201).json(result);
    } catch (error) {
      respondError(error, res);
    }
  });

  router.get('/:code/stats', (req: Request, res: Response) => {
    try {
      const stats = service.getStats(toCode(req.params.code));
      res.status(200).json(stats);
    } catch (error) {
      respondError(error, res);
    }
  });

  router.get('/:code', (req: Request, res: Response) => {
    try {
      const record = service.redirect(toCode(req.params.code));
      res.redirect(302, record.url);
    } catch (error) {
      respondError(error, res);
    }
  });

  return router;
}

function respondError(error: unknown, res: Response): void {
  if (error instanceof NotFoundError) {
    res.status(404).json({ error: 'Short URL not found' });
    return;
  }

  if (error instanceof InvalidUrlError || error instanceof InvalidBodyError) {
    res.status(400).json({ error: error.message });
    return;
  }

  if (error instanceof CodeGenerationError) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(500).json({ error: 'Internal server error' });
}