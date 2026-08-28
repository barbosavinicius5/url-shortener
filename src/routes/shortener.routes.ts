import express from "express";
import { ShortenerService } from "../services/shortener.service";

const INVALID_URL_MESSAGE = "A valid http(s) URL is required";
const NOT_FOUND_MESSAGE = "Short URL not found";

export function createShortenerRouter(
  service: ShortenerService,
  port: number,
): express.Router {
  const router = express.Router();

  router.post("/shorten", (req, res) => {
    const body = req.body as { url?: unknown } | undefined;
    const url = body?.url;

    if (!ShortenerService.isValidUrl(url)) {
      res.status(400).json({ error: INVALID_URL_MESSAGE });
      return;
    }

    const result = service.createShortUrl(url, port);
    res.status(201).json(result);
  });

  router.get("/:code/stats", (req, res) => {
    const record = service.getStats(req.params.code);
    if (!record) {
      res.status(404).json({ error: NOT_FOUND_MESSAGE });
      return;
    }

    res.status(200).json({ code: record.code, url: record.url, hits: record.hits });
  });

  router.get("/:code", (req, res) => {
    const record = service.redirect(req.params.code);
    if (!record) {
      res.status(404).json({ error: NOT_FOUND_MESSAGE });
      return;
    }

    res.redirect(302, record.url);
  });

  return router;
}