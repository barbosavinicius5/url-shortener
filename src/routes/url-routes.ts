import { Router, Request, Response } from "express";
import { UrlService, InvalidUrlError } from "../services/url-service";

export function createUrlRouter(urlService: UrlService, port: number): Router {
  const router = Router();

  router.post("/shorten", (req: Request, res: Response): void => {
    try {
      const body = req.body;
      const rawUrl =
        typeof body === "object" && body !== null && "url" in body
          ? (body as { url: unknown }).url
          : undefined;

      const result = urlService.createShortUrl(rawUrl);
      const shortUrl = `http://localhost:${port}/${result.code}`;

      res.status(201).json({
        code: result.code,
        shortUrl,
      });
    } catch (err: unknown) {
      if (err instanceof InvalidUrlError) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.status(500).json({ error: "Internal server error" });
    }
  });

  router.get("/:code/stats", (req: Request, res: Response): void => {
    const { code } = req.params;
    if (!code) {
      res.status(404).json({ error: "Short URL not found" });
      return;
    }

    const stats = urlService.getStats(code);
    if (!stats) {
      res.status(404).json({ error: "Short URL not found" });
      return;
    }

    res.status(200).json({
      code: stats.code,
      url: stats.url,
      hits: stats.hits,
    });
  });

  router.get("/:code", (req: Request, res: Response): void => {
    const { code } = req.params;
    if (!code) {
      res.status(404).json({ error: "Short URL not found" });
      return;
    }

    const targetUrl = urlService.redirect(code);
    if (!targetUrl) {
      res.status(404).json({ error: "Short URL not found" });
      return;
    }

    res.redirect(302, targetUrl);
  });

  return router;
}