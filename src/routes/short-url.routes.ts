import { Router, json, type Request, type Response } from "express";
import type { CreateShortUrlRequest } from "../types";
import { CodeGenerationError, ShortUrlService } from "../services/short-url.service";
import { isValidHttpUrl } from "../validation/url-validation";

export function createShortUrlRouter(service: ShortUrlService): Router {
  const router = Router();

  router.post("/shorten", (req: Request, res: Response) => {
    const body = req.body as CreateShortUrlRequest;
    if (!isValidHttpUrl(body?.url)) {
      res.status(400).json({
        error: "Field 'url' is required and must be an HTTP(S) URL",
      });
      return;
    }
    try {
      const created = service.create(body.url);
      res.status(201).json(created);
    } catch (error) {
      if (error instanceof CodeGenerationError) {
        res.status(500).json({ error: error.message });
        return;
      }
      throw error;
    }
  });

  // IMPORTANT: the stats route must be registered before the parametric
  // redirect route so that "stats" is never treated as a short code.
  router.get("/:code/stats", (req: Request, res: Response) => {
    const stats = service.stats(req.params["code"] ?? "");
    if (!stats) {
      res.status(404).json({ error: "Short URL not found" });
      return;
    }
    res.status(200).json(stats);
  });

  router.get("/:code", (req: Request, res: Response) => {
    const target = service.redirect(req.params["code"] ?? "");
    if (!target) {
      res.status(404).json({ error: "Short URL not found" });
      return;
    }
    res.redirect(302, target);
  });

  return router;
}