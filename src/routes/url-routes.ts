import { Router } from 'express';
import type { UrlShortenerService } from '../services/url-shortener-service.js';
import type { ShortenRequestBody, ShortenResponse, StatsResponse, ErrorResponse } from '../types/short-url.js';

export function createUrlRoutes(service: UrlShortenerService): Router {
  const router = Router();

  // POST /shorten
  router.post('/shorten', (req, res) => {
    const body = req.body as ShortenRequestBody;
    const validation = service.validateUrl(body.url);

    if (!validation.valid) {
      const response: ErrorResponse = { error: validation.error };
      res.status(400).json(response);
      return;
    }

    const record = service.shorten(validation.url);
    const response: ShortenResponse = {
      code: record.code,
      shortUrl: service.getShortUrl(record.code),
    };
    res.status(201).json(response);
  });

  // GET /:code/stats (must be before /:code to avoid being treated as :code)
  router.get('/:code/stats', (req, res) => {
    const record = service.getStats(req.params['code']!);
    if (!record) {
      const response: ErrorResponse = { error: 'Short URL not found' };
      res.status(404).json(response);
      return;
    }

    const response: StatsResponse = {
      code: record.code,
      url: record.url,
      hits: record.hits,
    };
    res.status(200).json(response);
  });

  // GET /:code (redirect)
  router.get('/:code', (req, res) => {
    const record = service.redirect(req.params['code']!);
    if (!record) {
      const response: ErrorResponse = { error: 'Short URL not found' };
      res.status(404).json(response);
      return;
    }

    res.redirect(302, record.url);
  });

  return router;
}