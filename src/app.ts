import express, { Express } from "express";
import { MemoryUrlStore } from "./store/memory-url-store";
import { UrlShortenerService } from "./services/url-shortener-service";
import { createUrlRouter } from "./routes/url-routes";
import { UrlStore } from "./types/url-shortener";

export const DEFAULT_PORT = 3000;

export interface CreateAppOptions {
  store?: UrlStore;
  port?: number;
}

export function createApp(options: CreateAppOptions = {}): Express {
  const port = options.port ?? DEFAULT_PORT;
  const store = options.store ?? new MemoryUrlStore();
  const service = new UrlShortenerService(store, port);

  const app = express();
  app.use(express.json());
  app.use(createUrlRouter({ service }));

  app.use((req, res) => {
    res.status(404).json({ error: "not found" });
  });

  return app;
}