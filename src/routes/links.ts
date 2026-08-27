import { Router, Request, Response } from 'express';
import { ShortenerService, validateCreateLink } from '../services/shortener-service';

export function createLinksRouter(service: ShortenerService): Router {
  const router = Router();

  router.post('/shorten', (req: Request, res: Response) => {
    const validation = validateCreateLink(req.body);
    if (!validation.valid) {
      res.status(400).json({ error: validation.message });
      return;
    }

    const result = service.createLink(validation.url);
    res.status(201).json(result);
  });

  // Stats route must be registered BEFORE the catch-all :code route
  router.get('/:code/stats', (req: Request, res: Response) => {
    const { code } = req.params;
    const stats = service.getStats(code);
    if (!stats) {
      res.status(404).json({ error: `Code "${code}" not found` });
      return;
    }
    res.status(200).json(stats);
  });

  router.get('/:code', (req: Request, res: Response) => {
    const { code } = req.params;
    const record = service.findAndIncrement(code);
    if (!record) {
      res.status(404).json({ error: `Code "${code}" not found` });
      return;
    }
    res.redirect(302, record.originalUrl);
  });

  return router;
}