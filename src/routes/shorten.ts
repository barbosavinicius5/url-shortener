import { Router, Request, Response } from 'express';
import { InvalidUrlError, UrlShortenerService } from '../services/url-shortener.service';

export function createShortenRouter(service: UrlShortenerService): Router {
  const router = Router();
  router.post('/shorten', (req: Request, res: Response) => {
    const body = req.body as unknown;
    const url = typeof body === 'object' && body !== null && 'url' in body
      ? (body as Record<string, unknown>).url
      : undefined;
    try {
      res.status(201).json(service.createShortUrl(url));
    } catch (error: unknown) {
      if (error instanceof InvalidUrlError) {
        res.status(400).json({ error: error.message });
        return;
      }
      throw error;
    }
  });
  return router;
}