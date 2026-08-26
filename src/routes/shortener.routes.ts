import { Router, Request, Response } from 'express';
import { UrlShortenerService } from '../services/url-shortener.service';

function getCode(req: Request): string | undefined {
  const code = req.params.code;
  return typeof code === 'string' ? code : undefined;
}

export function createShortenerRouter(service: UrlShortenerService, port: number): Router {
  const router = Router();

  router.post('/shorten', (req: Request, res: Response) => {
    if (req.body === null || typeof req.body !== 'object' || Array.isArray(req.body) || !('url' in req.body)) {
      res.status(400).json({ error: 'Request body must contain a url' });
      return;
    }
    try {
      res.status(201).json(service.create(req.body.url, port));
    } catch (error: unknown) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid URL' });
    }
  });

  router.get('/:code/stats', (req: Request, res: Response) => {
    const code = getCode(req);
    const record = code === undefined ? undefined : service.stats(code);
    if (!record) {
      res.status(404).json({ error: 'Short URL not found' });
      return;
    }
    res.status(200).json(record);
  });

  router.get('/:code', (req: Request, res: Response) => {
    const code = getCode(req);
    const record = code === undefined ? undefined : service.redirect(code);
    if (!record) {
      res.status(404).json({ error: 'Short URL not found' });
      return;
    }
    res.redirect(302, record.url);
  });

  return router;
}