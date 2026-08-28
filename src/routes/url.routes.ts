import { Request, Response, Router } from "express";
import { InvalidUrlError, isValidHttpUrl, UrlShortenerService } from "../services/url-shortener.service";

const INVALID_URL_MESSAGE = '"url" must be a non-empty string starting with "http://" or "https://"';

export function sendJsonError(res: Response, status: number, message: string): void {
  res.status(status).json({ error: message });
}

function extractUrlFromBody(body: unknown): unknown {
  if (typeof body !== "object" || body === null) {
    return undefined;
  }
  return (body as Record<string, unknown>).url;
}

export function createUrlRoutes(service: UrlShortenerService): Router {
  const router = Router();

  router.post("/shorten", (req: Request, res: Response) => {
    const url = extractUrlFromBody(req.body);
    if (!isValidHttpUrl(url)) {
      sendJsonError(res, 400, INVALID_URL_MESSAGE);
      return;
    }

    try {
      const created = service.createShortUrl({ url });
      res.status(201).json(created);
    } catch (error) {
      if (error instanceof InvalidUrlError) {
        sendJsonError(res, 400, error.message);
        return;
      }
      throw error;
    }
  });

  // Registered BEFORE GET /:code so that "stats" is never captured as a short code.
  router.get("/:code/stats", (req: Request, res: Response) => {
    const stats = service.getStats(req.params.code);
    if (stats === undefined) {
      sendJsonError(res, 404, `short code "${req.params.code}" not found`);
      return;
    }
    res.status(200).json(stats);
  });

  router.get("/:code", (req: Request, res: Response) => {
    const record = service.getRedirect(req.params.code);
    if (record === undefined) {
      sendJsonError(res, 404, `short code "${req.params.code}" not found`);
      return;
    }
    res.redirect(302, record.url);
  });

  return router;
}