import { Router, Request, Response } from "express";
import { UrlShortenerService } from "../services/url-shortener-service";

export function createLinkRouter(service: UrlShortenerService): Router {
  const router = Router();

  // Register GET /:code/stats BEFORE GET /:code so "stats" is not
  // interpreted as a short code.
  router.get("/:code/stats", (req: Request, res: Response) => {
    const code = req.params.code as string;
    const stats = service.getStats(code);

    if (!stats) {
      res.status(404).json({ error: "Short URL not found" });
      return;
    }

    res.status(200).json(stats);
  });

  router.get("/:code", (req: Request, res: Response) => {
    const code = req.params.code as string;
    const originalUrl = service.getOriginalUrl(code);

    if (!originalUrl) {
      res.status(404).json({ error: "Short URL not found" });
      return;
    }

    service.recordHit(code);
    res.redirect(302, originalUrl);
  });

  return router;
}