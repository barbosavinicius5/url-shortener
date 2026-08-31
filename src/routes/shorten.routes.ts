import { Router } from 'express';
import { ShortenController } from '../controllers/shorten.controller';

export function createShortenRouter(controller: ShortenController): Router {
  const router = Router();
  router.post('/shorten', controller.create);
  return router;
}