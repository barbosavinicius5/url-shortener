import express from "express";
import type { Request, Response, NextFunction } from "express";
import {
  UrlService,
  UrlValidationError,
} from "../services/url-service";

export function createUrlRouter(service: UrlService): express.Router {
  const router = express.Router();

  router.post(
    "/shorten",
    (req: Request, res: Response, next: NextFunction): void => {
      try {
        const result = service.createShortUrl(req.body?.url);
        res.status(201).json(result);
      } catch (err) {
        if (err instanceof UrlValidationError) {
          res.status(400).json({ error: err.message });
          return;
        }
        next(err);
      }
    },
  );

  // Register stats route BEFORE the catch-all :code route
  router.get("/:code/stats", (req: Request, res: Response): void => {
    const stats = service.getStats(req.params.code!);
    if (stats === null) {
      res.status(404).json({ error: "Code not found" });
      return;
    }
    res.status(200).json(stats);
  });

  router.get("/:code", (req: Request, res: Response): void => {
    const url = service.redirectToUrl(req.params.code!);
    if (url === null) {
      res.status(404).json({ error: "Code not found" });
      return;
    }
    res.redirect(302, url);
  });

  return router;
}