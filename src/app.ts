import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { DEFAULT_PORT } from "./config";
import { UrlStore } from "./store/urlStore";
import { createUrlRouter } from "./routes/urlRoutes";

/**
 * Factory that builds the Express application without calling listen.
 *
 * Mounts express.json() (with a JSON error handler that responds 400 instead of
 * HTML) and the URL routes. A new UrlStore is created when none is injected so
 * production boots with fresh state and tests can inject isolated instances.
 */
export function createApp(options: { store?: UrlStore; port?: number } = {}): Express {
  const store = options.store ?? new UrlStore();
  const port = options.port ?? DEFAULT_PORT;

  const app = express();
  app.use(express.json());

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    const parsed = err as NodeJS.ErrnoException & { type?: string; status?: number };
    if (parsed.type === "entity.parse.failed" || parsed.status === 400) {
      res.status(400).json({ error: "Invalid JSON body" });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  });

  app.use(createUrlRouter({ store, port }));

  return app;
}