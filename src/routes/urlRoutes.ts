import { Router, type Request, type Response } from "express";
import type { UrlStore } from "../store/urlStore";
import { UrlService, UrlServiceError } from "../services/urlService";

/**
 * Build the URL routes, receiving dependencies explicitly.
 *
 * POST /shorten is registered before the parameterized routes. The stats route
 * is registered before GET /:code so that "/:code/stats" is not mistaken for a
 * redirection code.
 */
export function createUrlRouter(options: { store: UrlStore; port: number }): Router {
  const service = new UrlService(options.store, options.port);
  const router = Router();

  router.post("/shorten", (req: Request, res: Response) => {
    try {
      const result = service.create(req.body?.url);
      res.status(201).json(result);
    } catch (err) {
      if (err instanceof UrlServiceError) {
        res.status(400).json({ error: err.message });
        return;
      }
      throw err;
    }
  });

  router.get("/:code/stats", (req: Request, res: Response) => {
    const stats = service.getStats(req.params.code);
    if (!stats) {
      res.status(404).json({ error: "Short URL not found" });
      return;
    }
    res.status(200).json(stats);
  });

  router.get("/:code", (req: Request, res: Response) => {
    const record = service.redirect(req.params.code);
    if (!record) {
      res.status(404).json({ error: "Short URL not found" });
      return;
    }
    res.redirect(302, record.url);
  });

  return router;
}