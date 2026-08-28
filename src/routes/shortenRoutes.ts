import { Router, Request, Response, NextFunction } from "express";
import { UrlShortenerService, isValidUrl } from "../services/urlShortenerService";
import { resolveBaseUrl } from "../config";

export function createShortenRoutes(service: UrlShortenerService, baseUrl: string): Router {
  const router = Router();

  router.post("/shorten", (req: Request, res: Response) => {
    const raw = (req.body as Record<string, unknown>)?.url;

    if (!isValidUrl(raw)) {
      res.status(400).json({ error: "A valid http:// or https:// URL is required" });
      return;
    }

    const result = service.createShortUrl(raw as string, baseUrl);
    res.status(201).json({ code: result.code, shortUrl: result.shortUrl });
  });

  router.get("/:code/stats", (req: Request, res: Response) => {
    const { code } = req.params;
    const stats = service.getStats(code);

    if (!stats) {
      res.status(404).json({ error: "Short URL not found" });
      return;
    }

    res.status(200).json(stats);
  });

  router.get("/:code", (req: Request, res: Response) => {
    const { code } = req.params;
    const record = service.redirect(code);

    if (!record) {
      res.status(404).json({ error: "Short URL not found" });
      return;
    }

    res.redirect(302, record.url);
  });

  return router;
}