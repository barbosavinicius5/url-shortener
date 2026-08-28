import { Router } from "express";
import { UrlShortenerService } from "../services/url-shortener.service";
import { ShortenRequest } from "../types/url";

export function createShortenRoutes(service: UrlShortenerService): Router {
  const router = Router();

  router.post("/shorten", (req, res) => {
    const body = req.body as ShortenRequest;
    const url = service.validateUrl(body.url);
    if (!url) {
      res.status(400).json({
        error: "url must be a valid HTTP or HTTPS URL",
      });
      return;
    }
    const result = service.createShortUrl(url);
    res.status(201).json(result);
  });

  return router;
}