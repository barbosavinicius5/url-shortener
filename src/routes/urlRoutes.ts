import { Router } from 'express';
import type { Request, Response } from 'express';
import type { UrlService } from '../services/urlService';

function extractUrlFromBody(body: unknown): unknown {
  if (typeof body !== 'object' || body === null) {
    return undefined;
  }
  return (body as Record<string, unknown>).url;
}

export function createUrlRoutes(urlService: UrlService): Router {
  const router = Router();

  router.post('/shorten', (req: Request, res: Response) => {
    const result = urlService.createShortUrl(extractUrlFromBody(req.body));
    if (!result.ok) {
      const status = result.kind === 'invalid-url' ? 400 : 500;
      res.status(status).json({ error: result.error });
      return;
    }
    res.status(201).json(result.data);
  });

  // Registered before GET /:code so that paths like /abc123/stats are served
  // by this specific route instead of falling through to the generic one.
  router.get('/:code/stats', (req: Request, res: Response) => {
    const stats = urlService.getStats(req.params.code);
    if (stats === undefined) {
      res.status(404).json({ error: 'Short URL not found' });
      return;
    }
    res.status(200).json(stats);
  });

  router.get('/:code', (req: Request, res: Response) => {
    const record = urlService.redirectToOriginalUrl(req.params.code);
    if (record === undefined) {
      res.status(404).json({ error: 'Short URL not found' });
      return;
    }
    res.redirect(302, record.url);
  });

  return router;
}