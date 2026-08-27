import { Router } from 'express';
import type { Request, Response } from 'express';
import type { UrlShortenerService } from '../services/url-shortener.service.js';
import { ValidationError } from '../services/url-shortener.service.js';

export function createUrlRoutes(service: UrlShortenerService): Router {
  const router = Router();

  // POST /shorten
  router.post('/shorten', (req: Request, res: Response) => {
    try {
      const body = req.body;

      if (body === null || body === undefined || typeof body !== 'object') {
        res.status(400).json({ error: 'Request body must be a JSON object' });
        return;
      }

      const { url } = body as Record<string, unknown>;

      if (typeof url !== 'string' || url.trim().length === 0) {
        res.status(400).json({ error: 'url must be a non-empty string' });
        return;
      }

      const result = service.createShortUrl(url);
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({ error: error.message });
        return;
      }
      throw error;
    }
  });

  // GET /:code/stats — Must be registered before /:code
  router.get('/:code/stats', (req: Request, res: Response) => {
    const code = req.params['code'];
    if (code === undefined || code === '') {
      res.status(404).json({ error: 'Short URL not found' });
      return;
    }
    const record = service.getRecord(code);

    if (!record) {
      res.status(404).json({ error: 'Short URL not found' });
      return;
    }

    res.status(200).json({ code: record.code, url: record.url, hits: record.hits });
  });

  // GET /:code
  router.get('/:code', (req: Request, res: Response) => {
    const code = req.params['code'];
    if (code === undefined || code === '') {
      res.status(404).json({ error: 'Short URL not found' });
      return;
    }
    const record = service.getRecordForRedirect(code);

    if (!record) {
      res.status(404).json({ error: 'Short URL not found' });
      return;
    }

    res.redirect(302, record.url);
  });

  return router;
}