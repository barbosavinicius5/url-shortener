import express, { type Express, type NextFunction, type Request, type Response } from "express";
import { createShortenerRouter, handleRouteError } from "./routes/shortener.routes.js";
import { UrlShortenerService } from "./services/url-shortener.service.js";

export interface CreateAppOptions {
  service: UrlShortenerService;
}

export function createApp({ service }: CreateAppOptions): Express {
  const app = express();

  app.use(express.json());
  app.use(createShortenerRouter(service));
  app.use(handleRouteError);
  app.use((error: unknown, _request: Request, response: Response, _next: NextFunction): void => {
    if (isJsonParseError(error)) {
      response.status(400).json({ error: "Invalid JSON payload" });
      return;
    }

    response.status(500).json({ error: "Internal server error" });
  });

  return app;
}

function isJsonParseError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const candidate = error as { type?: unknown };
  return candidate.type === "entity.parse.failed";
}