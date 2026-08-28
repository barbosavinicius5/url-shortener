import express from "express";
import type { Request, Response, NextFunction } from "express";
import { UrlStore } from "./store/url-store";
import { UrlService } from "./services/url-service";
import { createUrlRouter } from "./routes/url-routes";
import { getPort, buildBaseUrl } from "./config";

export interface AppOptions {
  port?: number;
  store?: UrlStore;
  baseUrl?: string;
}

export function createApp(options: AppOptions = {}): express.Express {
  const store = options.store ?? new UrlStore();
  const baseUrl = options.baseUrl ?? buildBaseUrl(options.port ?? getPort());
  const service = new UrlService({ store, baseUrl });

  const app = express();
  app.use(express.json());
  app.use("/", createUrlRouter(service));

  // Error handling middleware — must have exactly 4 params for Express
  app.use(
    (err: unknown, _req: Request, res: Response, next: NextFunction): void => {
      if (res.headersSent) {
        next(err);
        return;
      }
      if (err instanceof SyntaxError) {
        res.status(400).json({ error: "Invalid JSON body" });
        return;
      }
      res.status(500).json({ error: "Internal server error" });
    },
  );

  return app;
}