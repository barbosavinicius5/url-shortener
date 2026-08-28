import { Router, Request, Response } from "express";
import { UrlShortenerService, ValidationError } from "../services/url-shortener-service";

export function createShortenRouter(service: UrlShortenerService): Router {
  const router = Router();

  router.post("/shorten", (req: Request, res: Response) => {
    const body = req.body;

    if (body === undefined || body === null || typeof body !== "object") {
      res.status(400).json({ error: "Request body must be a JSON object" });
      return;
    }

    const url = (body as Record<string, unknown>).url;

    if (typeof url !== "string" || url.trim() === "") {
      res.status(400).json({ error: "url is required" });
      return;
    }

    try {
      const result = service.createShortLink(url);
      res.status(201).json(result);
    } catch (err) {
      if (err instanceof ValidationError) {
        res.status(400).json({ error: err.message });
        return;
      }
      throw err;
    }
  });

  return router;
}