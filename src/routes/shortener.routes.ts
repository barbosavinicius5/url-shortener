import { Router, type NextFunction, type Request, type Response } from "express";
import {
  InvalidUrlError,
  UrlNotFoundError,
  UrlShortenerService,
} from "../services/url-shortener.service.js";

interface CodeParams {
  code: string;
}

export function createShortenerRouter(service: UrlShortenerService): Router {
  const router = Router();

  router.post("/shorten", (request: Request, response: Response, next: NextFunction) => {
    try {
      const result = service.createShortUrl(request.body as unknown);
      response.status(201).json(result);
    } catch (error: unknown) {
      next(error);
    }
  });

  router.get(
    "/:code/stats",
    (request: Request<CodeParams>, response: Response, next: NextFunction) => {
      try {
        const stats = service.getStats(request.params.code);
        response.status(200).json(stats);
      } catch (error: unknown) {
        next(error);
      }
    },
  );

  router.get(
    "/:code",
    (request: Request<CodeParams>, response: Response, next: NextFunction) => {
      try {
        const record = service.redirect(request.params.code);
        response.redirect(302, record.url);
      } catch (error: unknown) {
        next(error);
      }
    },
  );

  return router;
}

export function handleRouteError(
  error: unknown,
  _request: Request,
  response: Response,
  next: NextFunction,
): void {
  if (error instanceof InvalidUrlError) {
    response.status(400).json({ error: error.message });
    return;
  }

  if (error instanceof UrlNotFoundError) {
    response.status(404).json({ error: error.message });
    return;
  }

  next(error);
}