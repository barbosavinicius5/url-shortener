import express, { ErrorRequestHandler } from "express";
import { createShortenerRouter } from "./routes/shortener.routes.js";
import { ShortenerService } from "./services/shortener.service.js";
import { InMemoryShorteningStore, ShorteningStore } from "./stores/shortening.store.js";
import { getPort, DEFAULT_PORT } from "./config.js";

const jsonParseErrorHandler: ErrorRequestHandler = (
  err,
  _req,
  res,
  _next,
) => {
  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({ error: "Invalid JSON in request body." });
    return;
  }
  res.status(500).json({ error: "Internal server error." });
};

export interface CreateAppOptions {
  port?: number;
  store?: ShorteningStore;
}

export function createApp(options: CreateAppOptions = {}): express.Express {
  const port = options.port ?? DEFAULT_PORT;
  const store = options.store ?? new InMemoryShorteningStore();
  const service = new ShortenerService(store, port);

  const app = express();

  app.use(express.json());
  app.use(jsonParseErrorHandler);

  app.use(createShortenerRouter({ service, store }));

  // Fallback 404 for unknown routes
  app.use((_req, res) => {
    res.status(404).json({ error: "Not found." });
  });

  return app;
}

export function startServer(): void {
  const port = getPort();
  const app = createApp({ port });
  app.listen(port, () => {
    console.log(`URL shortener listening on http://localhost:${port}`);
  });
}

// Only start the server when this module is run directly
if (require.main === module) {
  startServer();
}