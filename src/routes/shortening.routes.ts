import { Router, Request, Response } from 'express';
import { InMemoryUrlStore } from '../store/in-memory-url.store';
import { ShorteningService } from '../services/shortening.service';

export function createShorteningRouter(service: ShorteningService, port: number): Router {
  const router = Router();

  router.post('/shorten', (req: Request, res: Response) => {
    const body: unknown = req.body;
    const input = typeof body === 'object' && body !== null && !Array.isArray(body)
      ? { url: (body as Record<string, unknown>).url }
      : { url: undefined };
    try {
      res.status(201).json(service.create(input, port));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid request' });
    }
  });

  router.get('/:code/stats', (req: Request<{ code: string }>, res: Response) => {
    const stats = service.getStats(req.params.code);
    if (!stats) return res.status(404).json({ error: 'Short URL not found' });
    return res.status(200).json(stats);
  });

  router.get('/:code', (req: Request<{ code: string }>, res: Response) => {
    const record = service.findByCode(req.params.code);
    if (!record) return res.status(404).json({ error: 'Short URL not found' });
    service.incrementHits(record.code);
    return res.redirect(302, record.url);
  });

  return router;
}

export function createService(store: InMemoryUrlStore): ShorteningService {
  return new ShorteningService(store);
}
