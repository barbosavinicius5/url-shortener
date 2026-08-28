import { NextFunction, Request, Response, Router } from 'express';
import { UrlShortenerService } from '../services/urlShortenerService';
import { InvalidUrlError } from '../types/url';

/**
 * Builds the URL-related HTTP routes bound to the given service and port.
 *
 * The port is injected (instead of being read from `process.env` inside the
 * route) so the service builds `shortUrl` from the real configured port, and
 * so tests can construct isolated apps on arbitrary ports.
 *
 * IMPORTANT: the stats route (`/:code/stats`) is registered before the generic
 * redirect route (`/:code`) so it is never mistaken for a redirect code.
 */
export function createUrlRouter(
  service: UrlShortenerService,
  port: number,
): Router {
  const router = Router();

  router.post('/shorten', (req: Request, res: Response) => {
    try {
      const url = req.body?.url;
      const result = service.createShortUrl(url, port);
      res.status(201).json({ code: result.code, shortUrl: result.shortUrl });
    } catch (error) {
      if (error instanceof InvalidUrlError) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.get('/:code/stats', (req: Request, res: Response) => {
    const stats = service.getStats(req.params.code);
    if (!stats) {
      res.status(404).json({ error: 'Short URL not found' });
      return;
    }
    res.status(200).json({ code: stats.code, url: stats.url, hits: stats.hits });
  });

  router.get('/:code', (req: Request, res: Response) => {
    const record = service.getAndRecordHit(req.params.code);
    if (!record) {
      res.status(404).json({ error: 'Short URL not found' });
      return;
    }
    res.redirect(302, record.url);
  });

  // Final handler for unmatched routes: predictable 404 without disturbing
  // redirects emitted by the routes above.
  router.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Short URL not found' });
  });

  return router;
}

/**
 * JSON error handler for the whole app. Captures malformed JSON bodies
 * (produces 400) and any unexpected error (produces 500) without leaking
 * stack traces.
 */
export function jsonErrorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ error: 'Invalid JSON body' });
    return;
  }
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
}