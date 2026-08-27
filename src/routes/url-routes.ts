import { Router } from "express";
import { UrlShortenerService } from "../services/url-shortener-service";

interface CreateRoutesOptions {
  service: UrlShortenerService;
}

export function createUrlRouter({ service }: CreateRoutesOptions): Router {
  const router = Router();

  router.post("/shorten", (req, res) => {
    const body: unknown = req.body;
    const url =
      typeof body === "object" && body !== null
        ? (body as Record<string, unknown>)["url"]
        : undefined;

    const result = service.createShortUrl(url);
    if ("error" in result) {
      res.status(400).json(result);
      return;
    }
    res.status(201).json(result);
  });

  router.get("/:code/stats", (req, res) => {
    const stats = service.stats(req.params.code);
    if (!stats) {
      res.status(404).json({ error: "short URL not found" });
      return;
    }
    res.status(200).json(stats);
  });

  router.get("/:code", (req, res) => {
    const record = service.redirect(req.params.code);
    if (!record) {
      res.status(404).json({ error: "short URL not found" });
      return;
    }
    res.redirect(302, record.url);
  });

  return router;
}