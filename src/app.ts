import express, { Request, Response, NextFunction } from "express";
import { UrlShortenerService } from "./services/urlShortenerService";
import { InMemoryUrlStore } from "./storage/inMemoryUrlStore";
import { createShortenRoutes } from "./routes/shortenRoutes";
import { resolvePort, resolveBaseUrl } from "./config";

export function createApp(
  service?: UrlShortenerService,
  port?: number
) {
  const effectivePort = port ?? resolvePort(process.env.PORT);
  const baseUrl = resolveBaseUrl(effectivePort);
  const effectiveService = service ?? new UrlShortenerService(new InMemoryUrlStore());

  const app = express();

  app.use(express.json());

  app.use(createShortenRoutes(effectiveService, baseUrl));

  // Error-handling middleware for JSON parse errors
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (
      err instanceof SyntaxError &&
      "status" in err &&
      (err as unknown as { status: number }).status === 400 &&
      "body" in err
    ) {
      res.status(400).json({ error: "Invalid JSON body" });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}