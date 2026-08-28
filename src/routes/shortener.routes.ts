import { Router, Request, Response } from 'express';
import { ShortenerService } from '../services/shortener.service';
import { ShortenResponse, StatsResponse } from '../types/url-record';

const NOT_FOUND_ERROR = 'Short code not found';

export function createShortenerRouter(service: ShortenerService, port: number): Router {
  const router = Router();

  router.post('/shorten', (req: Request, res: Response) => {
    const body: unknown = req.body;
    const url = typeof body === 'object' && body !== null && 'url' in body
      ? (body as { url?: unknown }).url
      : undefined;

    if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
      res.status(400).json({ error: 'Invalid URL' });
      return;
    }

    const record = service.createShortUrl(url);
    const response: ShortenResponse = {
      code: record.code,
      shortUrl: `http://localhost:${port}/${record.code}`
    };
    res.status(201).json(response);
  });

  router.get('/:code/stats', (req: Request, res: Response) => {
    const code = Array.isArray(req.params.code) ? req.params.code[0] : req.params.code;
    const record = service.getStats(code);
    if (!record) {
      res.status(404).json({ error: NOT_FOUND_ERROR });
      return;
    }
    const response: StatsResponse = { code: record.code, url: record.url, hits: record.hits };
    res.status(200).json(response);
  });

  router.get('/:code', (req: Request, res: Response) => {
    const code = Array.isArray(req.params.code) ? req.params.code[0] : req.params.code;
    const record = service.resolveAndTrack(code);
    if (!record) {
      res.status(404).json({ error: NOT_FOUND_ERROR });
      return;
    }
    res.redirect(302, record.url);
  });

  return router;
}