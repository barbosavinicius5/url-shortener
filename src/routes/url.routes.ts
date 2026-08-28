import { Router, Request, Response } from 'express';
import {
  UrlShortenerService,
  InvalidUrlError,
  NotFoundError,
} from '../services/url-shortener.service';

/**
 * Build the URL-shortener router.
 *
 * Route ordering matters: `/:code/stats` is registered before `/:code` so that
 * stats is always treated as a suffix and never as a redirect code.
 *
 * @param service Domain service instance (injected for test isolation).
 * @param baseUrl Origin used to assemble `shortUrl` (e.g. `http://localhost:3000`).
 */
export function createUrlRouter(service: UrlShortenerService, baseUrl: string): Router {
  const router = Router();

  router.post('/shorten', (req: Request, res: Response) => {
    try {
      const record = service.createShortUrl(req.body?.url);
      res.status(201).json({ code: record.code, shortUrl: `${baseUrl}/${record.code}` });
    } catch (err) {
      if (err instanceof InvalidUrlError) {
        res.status(400).json({ error: err.message });
        return;
      }
      throw err;
    }
  });

  router.get('/:code/stats', (req: Request, res: Response) => {
    try {
      const stats = service.getStats(req.params.code);
      res.status(200).json(stats);
    } catch (err) {
      if (err instanceof NotFoundError) {
        res.status(404).json({ error: err.message });
        return;
      }
      throw err;
    }
  });

  router.get('/:code', (req: Request, res: Response) => {
    try {
      const record = service.redirect(req.params.code);
      res.redirect(302, record.url);
    } catch (err) {
      if (err instanceof NotFoundError) {
        res.status(404).json({ error: err.message });
        return;
      }
      throw err;
    }
  });

  return router;
}