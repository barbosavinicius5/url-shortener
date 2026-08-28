import { Router, Request, Response, NextFunction } from "express";
import { ShortenerService } from "../services/shortener.service.js";
import { ShorteningStore } from "../stores/shortening.store.js";

export interface ShortenerRouteDeps {
  service: ShortenerService;
  store: ShorteningStore;
}

export function createShortenerRouter(deps: ShortenerRouteDeps): Router {
  const router = Router();
  const { service, store } = deps;

  // POST /shorten — create a new shortening
  router.post("/shorten", (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as { url?: unknown };

      if (body === undefined || body === null || typeof body !== "object") {
        res.status(400).json({ error: "Request body must be a JSON object." });
        return;
      }

      const url = body.url;

      if (!service.isValidUrl(url)) {
        res.status(400).json({
          error:
            'Invalid or missing "url" field. URL must start with "http://" or "https://".',
        });
        return;
      }

      const result = service.createShortening(url);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  });

  // GET /:code/stats — must be registered BEFORE /:code
  router.get("/:code/stats", (req: Request, res: Response) => {
    const code = String(req.params.code);
    const stats = service.getStats(code);

    if (stats === undefined) {
      res.status(404).json({ error: `Shortening "${code}" not found.` });
      return;
    }

    res.status(200).json(stats);
  });

  // GET /:code — redirect to the original URL
  router.get("/:code", (req: Request, res: Response, next: NextFunction) => {
    try {
      const code = String(req.params.code);
      const result = service.resolve(code);

      if (result === undefined) {
        res.status(404).json({ error: `Shortening "${code}" not found.` });
        return;
      }

      res.redirect(302, result.shortUrl);
    } catch (err) {
      next(err);
    }
  });

  return router;
}