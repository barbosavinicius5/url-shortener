import express, { Request, Response, NextFunction } from "express";
import { UrlService } from "./url-service";
import { UrlStore } from "./types";
import { InMemoryUrlStore } from "./url-store";

export interface CreateAppOptions {
  port?: number;
  store?: UrlStore;
}

const DEFAULT_PORT = 3000;

export function createApp(options: CreateAppOptions = {}) {
  const port = options.port ?? DEFAULT_PORT;
  const store = options.store ?? new InMemoryUrlStore();
  const service = new UrlService(store, port);

  const app = express();

  app.use(express.json());

  // Error handler for malformed JSON
  app.use(
    (
      err: Error,
      _req: Request,
      res: Response,
      next: NextFunction,
    ) => {
      if (
        err instanceof SyntaxError &&
        "status" in err &&
        (err as any).status === 400 &&
        "body" in err
      ) {
        res.status(400).json({ error: "Invalid JSON in request body" });
        return;
      }
      next(err);
    },
  );

  // POST /shorten
  app.post("/shorten", (req: Request, res: Response) => {
    const body = req.body as Record<string, unknown> | null;

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      res.status(400).json({ error: "Request body must be a JSON object" });
      return;
    }

    const rawUrl = body.url;

    if (rawUrl === undefined || rawUrl === null) {
      res.status(400).json({ error: 'Field "url" is required' });
      return;
    }

    if (typeof rawUrl !== "string") {
      res.status(400).json({ error: 'Field "url" must be a string' });
      return;
    }

    const trimmed = rawUrl.trim();

    if (trimmed.length === 0) {
      res.status(400).json({ error: 'Field "url" must not be empty' });
      return;
    }

    const result = service.shorten(trimmed);

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.status(201).json({ code: result.code, shortUrl: result.shortUrl });
  });

  // GET /:code/stats — must be registered before GET /:code
  app.get("/:code/stats", (req: Request, res: Response) => {
    const code = req.params.code as string;
    const stats = service.getStats(code);

    if (!stats) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    res.status(200).json(stats);
  });

  // GET /:code
  app.get("/:code", (req: Request, res: Response) => {
    const code = req.params.code as string;
    const record = service.redirect(code);

    if (!record) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    res.redirect(302, record.url);
  });

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: "Not found" });
  });

  return app;
}