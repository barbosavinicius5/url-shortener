import { Router, Request, Response } from 'express';
import { UrlShortenerService } from '../services/url-shortener-service.js';

function isValidUrl(url: string): boolean {
  if (typeof url !== 'string') {
    return false;
  }
  const trimmed = url.trim();
  if (trimmed === '') {
    return false;
  }
  if (!/^https?:\/\//i.test(trimmed)) {
    return false;
  }
  try {
    new URL(trimmed);
    return true;
  } catch {
    return false;
  }
}

function getCodeParam(req: Request): string | undefined {
  const code = req.params.code;
  if (Array.isArray(code)) {
    return code[0];
  }
  return code;
}

export function createShortenRoutes(service: UrlShortenerService, baseUrl: string): Router {
  const router = Router();

  // POST /shorten
  router.post('/shorten', (req: Request, res: Response) => {
    const { url } = req.body ?? {};
    if (url === undefined || url === null) {
      res.status(400).json({ error: 'url is required' });
      return;
    }
    if (!isValidUrl(url)) {
      res.status(400).json({ error: 'url must be a valid HTTP or HTTPS URL' });
      return;
    }
    const link = service.createLink(url);
    res.status(201).json({
      code: link.code,
      shortUrl: `${baseUrl}/${link.code}`,
    });
  });

  // GET /:code/stats must come before /:code
  router.get('/:code/stats', (req: Request, res: Response) => {
    const code = getCodeParam(req);
    if (!code) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    const stats = service.getStats(code);
    if (!stats) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.status(200).json(stats);
  });

  // GET /:code
  router.get('/:code', (req: Request, res: Response) => {
    const code = getCodeParam(req);
    if (!code) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    const link = service.redirect(code);
    if (!link) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.redirect(302, link.url);
  });

  return router;
}