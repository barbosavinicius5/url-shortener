import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import type { UrlShortenerService } from "../services/urlShortenerService";
import { InvalidUrlError } from "../services/urlShortenerService";

export function createUrlRouter(service: UrlShortenerService): Router {
  const router = Router();

  router.post("/shorten", (req: Request, res: Response, next: NextFunction) => {
    try {
      const body: unknown = req.body;
      const url =
        typeof body === "object" && body !== null
          ? (body as Record<string, unknown>).url
          : undefined;
      const result = service.shorten(url);
      res.status(201).json(result);
    } catch (err) {
      if (err instanceof InvalidUrlError) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  });

  router.get("/:code/stats", (req: Request, res: Response) => {
    const code = req.params.code;
    if (typeof code !== "string") {
      res.status(404).json({ error: "Short URL not found" });
      return;
    }
    const record = service.getStats(code);
    if (!record) {
      res.status(404).json({ error: "Short URL not found" });
      return;
    }
    res.status(200).json({ code: record.code, url: record.url, hits: record.hits });
  });

  router.get("/:code", (req: Request, res: Response) => {
    const code = req.params.code;
    if (typeof code !== "string") {
      res.status(404).json({ error: "Short URL not found" });
      return;
    }
    const record = service.redirect(code);
    if (!record) {
      res.status(404).json({ error: "Short URL not found" });
      return;
    }
    res.redirect(302, record.url);
  });

  return router;
}