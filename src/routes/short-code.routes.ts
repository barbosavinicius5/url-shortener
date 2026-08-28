import { Router } from "express";
import { UrlShortenerService } from "../services/url-shortener.service";

export function createShortCodeRoutes(service: UrlShortenerService): Router {
  const router = Router();

  // /:code/stats MUST be registered before /:code
  router.get("/:code/stats", (req, res) => {
    const stats = service.getStats(req.params.code);
    if (!stats) {
      res.status(404).json({ error: "Short URL not found" });
      return;
    }
    res.status(200).json(stats);
  });

  router.get("/:code", (req, res) => {
    const result = service.resolve(req.params.code);
    if (!result) {
      res.status(404).json({ error: "Short URL not found" });
      return;
    }
    service.incrementHits(req.params.code);
    res.redirect(302, result.url);
  });

  return router;
}