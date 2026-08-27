import { Router, Request, Response } from 'express';
import { UrlService } from '../services/url.service';

export function createShortenerRouter(service: UrlService): Router {
  const router = Router();

  router.post('/shorten', (request: Request, response: Response) => {
    const body: unknown = request.body;
    if (!body || typeof body !== 'object' || Array.isArray(body) || !('url' in body)) {
      response.status(400).json({ error: 'Request body must contain a url' });
      return;
    }
    try {
      response.status(201).json(service.create((body as { url?: unknown }).url));
    } catch (error) {
      response.status(400).json({ error: error instanceof Error ? error.message : 'Invalid URL' });
    }
  });

  router.get('/:code/stats', (request: Request, response: Response) => {
    const code = request.params.code;
    if (typeof code !== 'string') {
      response.status(404).json({ error: 'Short code not found' });
      return;
    }
    const stats = service.getStats(code);
    if (!stats) {
      response.status(404).json({ error: 'Short code not found' });
      return;
    }
    response.status(200).json(stats);
  });

  router.get('/:code', (request: Request, response: Response) => {
    const code = request.params.code;
    if (typeof code !== 'string') {
      response.status(404).json({ error: 'Short code not found' });
      return;
    }
    const url = service.redirect(code);
    if (!url) {
      response.status(404).json({ error: 'Short code not found' });
      return;
    }
    response.redirect(302, url);
  });

  return router;
}