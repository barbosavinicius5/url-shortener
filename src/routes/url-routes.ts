import { Router, Request, Response } from 'express';
import { UrlShortenerService } from '../services/url-shortener-service';
import { getPort, buildShortUrl } from '../config';

export function createUrlRoutes(service: UrlShortenerService): Router {
  const router = Router();
  const port = getPort();

  // POST /shorten
  router.post('/shorten', (req: Request, res: Response) => {
    const url = req.body?.url;
    const validated = service.validateUrl(url);
    if (validated === null) {
      res.status(400).json({ error: 'Invalid URL' });
      return;
    }
    const record = service.createShortUrl(validated);
    res.status(201).json({
      code: record.code,
      shortUrl: buildShortUrl(record.code, port),
    });
  });

  // GET /:code/stats — registered before /:code to avoid matching "stats" as a code
  router.get('/:code/stats', (req: Request, res: Response) => {
    const { code } = req.params;
    const record = service.getStats(code);
    if (record === undefined) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.status(200).json({
      code: record.code,
      url: record.url,
      hits: record.hits,
    });
  });

  // GET /:code
  router.get('/:code', (req: Request, res: Response) => {
    const { code } = req.params;
    const record = service.redirect(code);
    if (record === undefined) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.redirect(302, record.url);
  });

  return router;
}