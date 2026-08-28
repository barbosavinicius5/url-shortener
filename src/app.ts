import express, { Express, Request, Response, NextFunction } from "express";
import { UrlStore, InMemoryUrlStore } from "./store/url-store";
import { UrlService, DefaultUrlService } from "./services/url-service";
import { createUrlRouter } from "./routes/url-routes";
import { DEFAULT_PORT } from "./config";

export interface AppOptions {
  store?: UrlStore;
  service?: UrlService;
  port?: number;
}

export function createApp(options: AppOptions = {}): Express {
  const app = express();
  const port = options.port ?? DEFAULT_PORT;
  const store = options.store ?? new InMemoryUrlStore();
  const service = options.service ?? new DefaultUrlService(store);

  app.use(express.json());

  // Handle malformed JSON body
  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (err instanceof SyntaxError && "status" in err && err.status === 400) {
      res.status(400).json({ error: "Malformed JSON payload" });
      return;
    }
    next(err);
  });

  app.use("/", createUrlRouter(service, port));

  return app;
}