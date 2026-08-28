import { Router, Request, Response } from 'express';
import { UrlShortenerService } from '../services/url-shortener-service';
import {
  createLinkController,
  redirectController,
  statsController,
} from './controllers/link-controller';

export function registerRoutes(
  router: Router,
  service: UrlShortenerService
): void {
  // POST /shorten must be registered first
  router.post('/shorten', (req: Request, res: Response) => {
    createLinkController(req, res, service);
  });

  // /:code/stats must be registered before /:code to avoid "stats" being treated as a code
  router.get('/:code/stats', (req: Request, res: Response) => {
    statsController(req, res, service);
  });

  router.get('/:code', (req: Request, res: Response) => {
    redirectController(req, res, service);
  });
}