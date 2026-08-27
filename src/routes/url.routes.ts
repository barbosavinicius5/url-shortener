import { Router, type Request, type Response } from 'express';
import { InvalidUrlError, UrlShortenerService } from '../services/url-shortener.service';

type CodeRequest = Request<{ code: string }>;

export function createUrlRouter(service: UrlShortenerService): Router {
  const router = Router();

  router.post('/shorten', (req: Request, res: Response): void => {
    const body: unknown = req.body;
    if (!isObject(body) || typeof body.url !== 'string') {
      res.status(400).json({ error: 'A valid http or https URL is required' });
      return;
    }
    try { res.status(201).json(service.create({ url: body.url })); }
    catch (error: unknown) {
      if (error instanceof InvalidUrlError) res.status(400).json({ error: error.message });
      else throw error;
    }
  });

  router.get('/:code/stats', (req: CodeRequest, res: Response): void => {
    const stats = service.getStats(req.params.code);
    if (!stats) { res.status(404).json({ error: 'Short URL not found' }); return; }
    res.status(200).json(stats);
  });

  router.get('/:code', (req: CodeRequest, res: Response): void => {
    const record = service.getAndCount(req.params.code);
    if (!record) { res.status(404).json({ error: 'Short URL not found' }); return; }
    res.redirect(302, record.url);
  });
  return router;
}

function isObject(value: unknown): value is { url?: unknown } {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}