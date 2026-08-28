import { Router, Request, Response, NextFunction } from 'express';
import { UrlShortenerService } from '../services/url-shortener-service';

export function createUrlRoutes(service: UrlShortenerService): Router {
  const router = Router();

  router.post('/shorten', (req: Request, res: Response) => {
    const result = service.createShortUrl(req.body);

    if (result.type === 'error') {
      if (result.error === 'Invalid JSON payload') {
        res.status(400).json({ error: result.error });
        return;
      }
      if (result.error === 'Invalid URL') {
        res.status(400).json({ error: result.error });
        return;
      }
      res.status(500).json({ error: result.error });
      return;
    }

    res.status(201).json(result.data);
  });

  router.get('/:code/stats', (req: Request, res: Response) => {
    const code = String(req.params['code'] ?? '');
    const result = service.getStats(code);

    if (result.type === 'error') {
      res.status(404).json({ error: result.error });
      return;
    }

    res.status(200).json(result.data);
  });

  router.get('/:code', (req: Request, res: Response) => {
    const code = String(req.params['code'] ?? '');
    const result = service.redirect(code);

    if (result.type === 'error') {
      res.status(404).json({ error: result.error });
      return;
    }

    const record = result.data as { originalUrl: string };
    res.redirect(302, record.originalUrl);
  });

  return router;
}