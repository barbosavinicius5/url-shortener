import { Router, Request, Response, NextFunction } from 'express';
import { UrlService, ValidationError } from '../services/url.service';

export function createUrlRouter(service: UrlService): Router {
  const router = Router();

  // POST /shorten
  router.post('/shorten', (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body;
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        res.status(400).json({ error: 'Request body must be a JSON object' });
        return;
      }

      const rawUrl = (body as Record<string, unknown>).url;
      if (rawUrl === undefined || rawUrl === null) {
        res.status(400).json({ error: 'Missing "url" field in request body' });
        return;
      }

      if (typeof rawUrl !== 'string') {
        res.status(400).json({ error: '"url" field must be a string' });
        return;
      }

      const result = service.shorten(rawUrl);
      res.status(201).json(result);
    } catch (err) {
      if (err instanceof ValidationError) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  });

  // GET /:code/stats
  router.get('/:code/stats', (req: Request, res: Response, next: NextFunction) => {
    try {
      const code = req.params.code;
      if (typeof code !== 'string' || !code) {
        res.status(404).json({ error: 'Short URL not found' });
        return;
      }

      const stats = service.getStats(code);
      if (!stats) {
        res.status(404).json({ error: 'Short URL not found' });
        return;
      }

      res.status(200).json(stats);
    } catch (err) {
      next(err);
    }
  });

  // GET /:code
  router.get('/:code', (req: Request, res: Response, next: NextFunction) => {
    try {
      const code = req.params.code;
      if (typeof code !== 'string' || !code) {
        res.status(404).json({ error: 'Short URL not found' });
        return;
      }

      const result = service.redirect(code);
      if (!result) {
        res.status(404).json({ error: 'Short URL not found' });
        return;
      }

      res.redirect(302, result.url);
    } catch (err) {
      next(err);
    }
  });

  return router;
}