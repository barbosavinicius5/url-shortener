import { Router, Request, Response } from 'express';
import { UrlStore } from '../types/url';
import {
  validateUrl,
  createShortUrlRecord,
  buildShortUrl,
  getPort,
} from '../services/urlShortenerService';

export function createShortenRoutes(store: UrlStore): Router {
  const router = Router();
  const port = getPort();

  // GET /:code/stats must be registered BEFORE /:code to avoid capture
  router.get('/:code/stats', (req: Request, res: Response): void => {
    const code = req.params.code as string;
    const record = store.findByCode(code);
    if (!record) {
      res.status(404).json({ error: 'Short URL not found' });
      return;
    }
    res.status(200).json({ code: record.code, url: record.url, hits: record.hits });
  });

  // POST /shorten
  router.post('/shorten', (req: Request, res: Response): void => {
    const { url } = req.body as { url?: unknown };
    const validationError = validateUrl(url);
    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    const record = createShortUrlRecord(url as string, store, port);
    const shortUrl = buildShortUrl(record.code, port);
    res.status(201).json({ code: record.code, shortUrl });
  });

  // GET /:code — redirect
  router.get('/:code', (req: Request, res: Response): void => {
    const code = req.params.code as string;
    const result = store.incrementHits(code);
    if (!result) {
      res.status(404).json({ error: 'Short URL not found' });
      return;
    }
    res.redirect(302, result.url);
  });

  return router;
}