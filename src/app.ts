import express, { Express, NextFunction, Request, Response } from "express";
import { UrlStore } from "./store/urlStore";
import { UrlShortenerService } from "./services/urlShortenerService";
import { createUrlRouter } from "./routes/urlRoutes";
import { DEFAULT_PORT } from "./services/urlShortenerService";

export function createApp(port: number = DEFAULT_PORT): Express {
  const app = express();

  app.use(express.json());
  app.use("/", createUrlRouter(new UrlShortenerService(new UrlStore()), port));

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: "Not found" });
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (
      typeof err === "object" &&
      err !== null &&
      "type" in err &&
      (err as { type?: string }).type === "entity.parse.failed"
    ) {
      res.status(400).json({ error: "Malformed JSON body" });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}