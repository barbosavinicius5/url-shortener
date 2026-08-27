import express, { type ErrorRequestHandler, type Express } from "express";

import { createShorteningRouter } from "./routes/shortening.routes";
import { ShorteningService } from "./services/shortening.service";
import { ShorteningStore } from "./stores/shortening.store";

export const DEFAULT_PORT = 3000;

export interface CreateAppOptions {
  store?: ShorteningStore;
  port?: number;
}

function readErrorStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : undefined;
}

/**
 * Last-resort error handler: keeps client responses as JSON and never leaks
 * stack traces or internal details (e.g. for malformed JSON bodies).
 */
const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }
  const status = readErrorStatus(error);
  if (status !== undefined && status >= 400 && status < 500) {
    res.status(status).json({ error: "Invalid request body" });
    return;
  }
  res.status(500).json({ error: "Internal server error" });
};

/**
 * Builds the Express application without opening any port. Production only
 * listens in src/server.ts; tests exercise the returned app via supertest
 * with an injected store and port for full isolation.
 */
export function createApp(options: CreateAppOptions = {}): Express {
  const store = options.store ?? new ShorteningStore();
  const port = options.port ?? DEFAULT_PORT;
  const service = new ShorteningService({ store, port });

  const app = express();
  app.use(express.json());
  app.use("/", createShorteningRouter(service));
  app.use(errorHandler);

  return app;
}