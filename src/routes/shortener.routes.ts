import { Router, Request, Response } from 'express';
import { CodeNotFoundError, ServiceValidationError, UrlShortenerService } from '../services/url-shortener.service';

function routeCode(req: Request): string {
  const value = req.params.code;
  return Array.isArray(value) ? value[0] : value;
}

export function shortenerRouter(service: UrlShortenerService): Router {
  const router = Router();

  router.post('/shorten', (req: Request, res: Response) => {
    try {
      res.status(201).json(service.create(req.body));
    } catch (error) {
      if (error instanceof ServiceValidationError) return res.status(400).json({ error: error.message });
      throw error;
    }
  });

  router.get('/:code/stats', (req: Request, res: Response) => {
    try {
      res.status(200).json(service.stats(routeCode(req)));
    } catch (error) {
      if (error instanceof CodeNotFoundError) return res.status(404).json({ error: error.message });
      throw error;
    }
  });

  router.get('/:code', (req: Request, res: Response) => {
    try {
      res.redirect(302, service.redirect(routeCode(req)));
    } catch (error) {
      if (error instanceof CodeNotFoundError) return res.status(404).json({ error: error.message });
      throw error;
    }
  });

  return router;
}