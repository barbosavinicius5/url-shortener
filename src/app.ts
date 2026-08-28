import express, { type Application } from "express";
import { MemoryUrlStore } from "./store/memoryUrlStore";
import { UrlShortenerService } from "./services/urlShortenerService";
import { createUrlRouter } from "./routes/urlRoutes";
import { errorHandler } from "./middleware/errorHandler";
import { DEFAULT_PORT } from "./config";

export function createApp(config?: { port?: number }): Application {
  const port = config?.port ?? DEFAULT_PORT;
  const store = new MemoryUrlStore();
  const service = new UrlShortenerService(store, port);
  const app = express();

  app.use(express.json());
  app.use(createUrlRouter(service));
  app.use(errorHandler);

  return app;
}

export { DEFAULT_PORT };