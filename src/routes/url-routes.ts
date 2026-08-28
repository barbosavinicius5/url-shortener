import { NextFunction, Request, Response, Router } from 'express';
import { InvalidUrlError, UrlShortenerService } from '../services/url-shortener-service.js';
import { ErrorResponse } from '../types/url.js';

/**
 * Normalizes a route parameter to a plain string: depending on the Express 5
 * typing, params may be typed as `string | string[]`.
 */
function codeParam(req: Request): string {
  const raw = req.params.code;
  return Array.isArray(raw) ? (raw[0] ?? '') : raw;
}

function respondNotFound(res: Response, code: string, action: string): void {
  const body: ErrorResponse = { error: `Short URL with code "${code}" not found (cannot ${action}).` };
  res.status(404).json(body);
}

/**
 * Registers the three HTTP endpoints of the API and converts service results
 * into HTTP status codes and JSON bodies.
 */
export function createUrlRouter(service: UrlShortenerService): Router {
  const router = Router();

  router.post('/shorten', (req: Request, res: Response, next: NextFunction) => {
    const rawBody: unknown = req.body;
    const rawUrl =
      typeof rawBody === 'object' && rawBody !== null
        ? (rawBody as { url?: unknown }).url
        : undefined;
    try {
      const result = service.createShortUrl(rawUrl);
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof InvalidUrlError) {
        const body: ErrorResponse = { error: error.message };
        res.status(400).json(body);
        return;
      }
      next(error);
    }
  });

  // Declared before GET /:code to make the intent explicit.
  router.get('/:code/stats', (req: Request, res: Response) => {
    const code = codeParam(req);
    const stats = service.getStats(code);
    if (!stats) {
      respondNotFound(res, code, 'fetch stats');
      return;
    }
    res.status(200).json(stats);
  });

  router.get('/:code', (req: Request, res: Response) => {
    const code = codeParam(req);
    const targetUrl = service.redirect(code);
    if (targetUrl === undefined) {
      respondNotFound(res, code, 'redirect');
      return;
    }
    res.redirect(302, targetUrl);
  });

  return router;
}