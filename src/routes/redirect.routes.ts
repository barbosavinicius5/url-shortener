import { Router } from 'express';
import { RedirectController } from '../controllers/redirect.controller';

export function createRedirectRouter(controller: RedirectController): Router {
  const router = Router();
  router.get('/:code/stats', controller.stats);
  router.get('/:code', controller.redirect);
  return router;
}