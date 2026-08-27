import { Router, Request, Response } from "express";
import { UrlShortenerService, InvalidUrlError } from "../services/urlShortenerService";

function extractCode(req: Request): string | undefined {
  const raw = req.params.code;
  if (typeof raw !== "string" || raw.length === 0) {
    return undefined;
  }
  return raw;
}

export function createUrlRouter(service: UrlShortenerService, port: number): Router {
  const router = Router();

  router.post("/shorten", (req: Request, res: Response) => {
    try {
      const result = service.createShortUrl(req.body, port);
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof InvalidUrlError) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: "Internal server error" });
    }
  });

  router.get("/:code/stats", (req: Request, res: Response) => {
    const code = extractCode(req);
    if (code === undefined) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const stats = service.getStats(code);
    if (stats === undefined) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.status(200).json(stats);
  });

  router.get("/:code", (req: Request, res: Response) => {
    const code = extractCode(req);
    if (code === undefined) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const record = service.redirect(code);
    if (record === undefined) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.redirect(302, record.url);
  });

  return router;
}