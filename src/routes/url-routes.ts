import { Router, type Request, type Response, type NextFunction } from "express";
import { isValidHttpUrl, shortenUrl, type ShortenResult } from "../services/url-shortener-service.js";
import type { UrlStore } from "../types/url.js";

export interface UrlRouterOptions {
  store: UrlStore;
  baseUrl: string;
  codeGenerator?: () => string;
}

export function createUrlRouter(options: UrlRouterOptions): Router {
  const { store, baseUrl, codeGenerator } = options;
  const router = Router();

  // POST /shorten
  router.post("/shorten", (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as unknown;
      if (body === null || typeof body !== "object" || Array.isArray(body)) {
        res.status(400).json({ error: "Request body must be a JSON object" });
        return;
      }

      const { url } = body as Record<string, unknown>;
      if (!isValidHttpUrl(url)) {
        res.status(400).json({ error: "Invalid or missing 'url' field. Must be a valid http or https URL." });
        return;
      }

      const result: ShortenResult = shortenUrl(url, store, baseUrl, codeGenerator);
      res.status(201).json({ code: result.code, shortUrl: result.shortUrl });
    } catch (err) {
      next(err);
    }
  });

  // GET /:code/stats — must be registered BEFORE /:code
  router.get("/:code/stats", (req: Request, res: Response) => {
    const code = req.params["code"] as string;
    const record = store.find(code);
    if (!record) {
      res.status(404).json({ error: "Code not found" });
      return;
    }
    res.status(200).json({ code: record.code, url: record.url, hits: record.hits });
  });

  // GET /:code
  router.get("/:code", (req: Request, res: Response) => {
    const code = req.params["code"] as string;
    const record = store.find(code);
    if (!record) {
      res.status(404).json({ error: "Code not found" });
      return;
    }
    store.incrementHits(code);
    res.redirect(302, record.url);
  });

  return router;
}