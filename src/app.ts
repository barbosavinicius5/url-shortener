import express from "express";
import type { ErrorRequestHandler, RequestHandler } from "express";
import { createShortenerRouter } from "./routes/shortener.routes";
import { ShortenerService } from "./services/shortener.service";
import { InMemoryUrlStore } from "./store/in-memory-url.store";
import type { UrlStore } from "./types/url";

export interface AppOptions {
  store?: UrlStore;
  port?: number;
}

export function createApp(options: AppOptions = {}): express.Express {
  const store = options.store ?? new InMemoryUrlStore();
  const port = options.port ?? 3000;
  const service = new ShortenerService(store);

  const app = express();
  app.use(express.json());
  app.use(createShortenerRouter(service, port));

  const notFoundHandler: RequestHandler = (_req, res) => {
    res.status(404).json({ error: "Route not found" });
  };

  const errorHandler: ErrorRequestHandler = (_err, _req, res, _next) => {
    res.status(500).json({ error: "Internal server error" });
  };

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}