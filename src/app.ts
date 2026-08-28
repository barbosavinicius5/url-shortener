import express, { Express, Request, Response, NextFunction } from "express";
import { LinkStore } from "./storage/link-store";
import { UrlShortenerService } from "./services/url-shortener-service";
import { createShortenRouter } from "./routes/shorten-routes";
import { createLinkRouter } from "./routes/link-routes";
import { AppConfig } from "./config/environment";

export interface AppDependencies {
  store?: LinkStore;
  config: AppConfig;
}

export function createApp(deps: AppDependencies): Express {
  const store = deps.store ?? new LinkStore();
  const service = new UrlShortenerService(store, deps.config);
  const app = express();

  app.use(express.json());

  app.use("/", createShortenRouter(service));
  app.use("/", createLinkRouter(service));

  // Error-handling middleware — must be registered after routes
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err?.message?.includes("Unexpected token") || err?.message?.includes("JSON")) {
      res.status(400).json({ error: "Invalid JSON body" });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}