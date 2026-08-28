import express, { type Request, type Response, type NextFunction } from "express";
import { createUrlRouter } from "./routes/url-routes.js";
import { InMemoryUrlStore } from "./store/in-memory-url-store.js";
import type { UrlStore } from "./types/url.js";

export interface CreateAppOptions {
  store?: UrlStore;
  baseUrl?: string;
  port?: number;
  codeGenerator?: () => string;
}

export function createApp(options: CreateAppOptions = {}) {
  const port = options.port ?? 3000;
  const baseUrl = options.baseUrl ?? `http://localhost:${port}`;
  const store = options.store ?? new InMemoryUrlStore();

  const app = express();
  app.use(express.json());
  app.use(createUrlRouter({ store, baseUrl, codeGenerator: options.codeGenerator }));

  // Error handler — must be after routes, with 4-arg signature
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    if (err?.type === "entity.parse.failed") {
      res.status(400).json({ error: "Invalid JSON in request body" });
      return;
    }
    res.status(400).json({ error: String(err?.message ?? "Unknown error") });
  });

  return app;
}