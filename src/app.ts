import express, { json, type Express, type NextFunction, type Request, type Response } from "express";
import { DEFAULT_PORT } from "./config/port";
import type { ShortUrlStore } from "./types";
import { InMemoryShortUrlStore } from "./stores/in-memory-short-url.store";
import { ShortUrlService } from "./services/short-url.service";
import { createShortUrlRouter } from "./routes/short-url.routes";

export interface CreateAppOptions {
  /** Store to use; defaults to a fresh volatile in-memory store. */
  store?: ShortUrlStore;
  /** Port used to build the base of `shortUrl` responses; defaults to 3000. */
  port?: number;
}

export { DEFAULT_PORT };

export function createApp(options: CreateAppOptions = {}): Express {
  const app = express();
  const store = options.store ?? new InMemoryShortUrlStore();
  const baseUrl = `http://localhost:${options.port ?? DEFAULT_PORT}`;
  const service = new ShortUrlService(store, baseUrl);

  app.use(json());

  app.use("/", createShortUrlRouter(service));

  // Final error handler: predictable JSON responses, no stack traces
  // (covers malformed JSON bodies among others).
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    void _next;
    if (
      typeof error === "object" &&
      error !== null &&
      "type" in error &&
      (error as { type?: unknown }).type === "entity.parse.failed"
    ) {
      res.status(400).json({ error: "Malformed JSON body" });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}