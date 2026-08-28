import express from "express";
import { InMemoryUrlStore } from "./store/in-memory-url.store";
import { UrlShortenerService } from "./services/url-shortener.service";
import { createShortenRoutes } from "./routes/shorten.routes";
import { createShortCodeRoutes } from "./routes/short-code.routes";
import { resolvePort, DEFAULT_PORT } from "./config";

export interface AppConfig {
  port: number;
}

export function createApp(config?: AppConfig): express.Express {
  const port = config?.port ?? resolvePort();
  const baseUrl = `http://localhost:${port}`;

  const store = new InMemoryUrlStore();
  const service = new UrlShortenerService(store, { baseUrl });

  const app = express();
  app.use(express.json());
  app.use(createShortenRoutes(service));
  app.use(createShortCodeRoutes(service));

  return app;
}

export const app = createApp();