import { Router, type Request, type Response } from "express";

import { ShorteningService } from "../services/shortening.service";
import type { CreateShorteningBody } from "../types/shortening";

const NOT_FOUND_MESSAGE = "Shortening not found";

/**
 * Reads the `url` property out of a parsed request body, tolerating bodies
 * that are absent or not plain objects (arrays, strings, null).
 */
function readBodyUrl(body: unknown): unknown {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return undefined;
  }
  return (body as CreateShorteningBody).url;
}

/**
 * HTTP transport layer: translates service outcomes into status codes,
 * JSON bodies and redirects. No business rule lives here.
 */
export function createShorteningRouter(service: ShorteningService): Router {
  const router = Router();

  router.post("/shorten", (req: Request, res: Response) => {
    const result = service.createShortening(readBodyUrl(req.body));
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.status(201).json(result.data);
  });

  // Registered before GET /:code so "/:code/stats" is never captured as a
  // plain code route.
  router.get("/:code/stats", (req: Request, res: Response) => {
    const result = service.getStats(req.params.code);
    if (!result.ok) {
      res.status(404).json({ error: NOT_FOUND_MESSAGE });
      return;
    }
    res.status(200).json(result.data);
  });

  router.get("/:code", (req: Request, res: Response) => {
    const result = service.resolveRedirect(req.params.code);
    if (!result.ok) {
      res.status(404).json({ error: NOT_FOUND_MESSAGE });
      return;
    }
    res.redirect(302, result.url);
  });

  return router;
}