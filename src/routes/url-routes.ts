import { Router, Request, Response } from 'express';
import { UrlShortenerService, isSupportedUrl } from '../services/url-shortener-service';

export function createUrlRouter(
  service: UrlShortenerService,
  shortUrlBase: string
): Router {
  const router = Router();

  // POST /shorten — create a short URL
  router.post('/shorten', (req: Request, res: Response) => {
    const { url } = req.body ?? {};

    if (url === undefined) {
      res.status(400).json({ error: 'URL is required' });
      return;
    }

    if (!isSupportedUrl(url)) {
      res
        .status(400)
        .json({ error: 'URL must start with http:// or https://' });
      return;
    }

    const { code } = service.shorten(url);
    const shortUrl = `${shortUrlBase}/${code}`;
    res.status(201).json({ code, shortUrl });
  });

  // GET /:code/stats — must come before /:code to avoid "stats" being matched as a code
  router.get('/:code/stats', (req: Request, res: Response) => {
    const code = req.params.code as string;
    const stats = service.getStats(code);
    if (!stats) {
      res.status(404).json({ error: 'Code not found' });
      return;
    }
    res.status(200).json(stats);
  });

  // GET /:code — redirect (and increment hits)
  router.get('/:code', (req: Request, res: Response) => {
    const code = req.params.code as string;
    const target = service.getRedirectTarget(code);
    if (!target) {
      res.status(404).json({ error: 'Code not found' });
      return;
    }
    // Increment hits only once on successful redirect
    service.incrementHits(code);
    res.redirect(302, target.url);
  });

  return router;
}