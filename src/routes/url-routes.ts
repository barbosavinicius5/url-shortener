import { Request, Response, Router } from 'express';
import { UrlShortenerService } from '../services/url-shortener-service';

function codeParam(req: Request): string {
  const raw: unknown = req.params.code;
  return Array.isArray(raw) ? String(raw[0]) : String(raw);
}

export function createUrlRouter(service: UrlShortenerService): Router {
  const router = Router();

  router.post('/shorten', (req: Request, res: Response) => {
    const body: unknown = req.body;
    try {
      const result = service.createShortUrl(
        (body as { url?: unknown } | undefined)?.url
      );
      res.status(201).json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';
      res.status(400).json({ error: message });
    }
  });

  router.get('/:code/stats', (req: Request, res: Response) => {
    const stats = service.getStats(codeParam(req));
    if (!stats) {
      res.status(404).json({ error: 'Short URL not found' });
      return;
    }
    res.status(200).json(stats);
  });

  router.get('/:code', (req: Request, res: Response) => {
    const record = service.resolveAndCount(codeParam(req));
    if (!record) {
      res.status(404).json({ error: 'Short URL not found' });
      return;
    }
    res.redirect(302, record.url);
  });

  return router;
}