import express, { ErrorRequestHandler, Express, RequestHandler } from "express";
import { getConfig } from "./config";
import { createUrlRoutes, sendJsonError } from "./routes/url.routes";
import { InvalidUrlError, UrlShortenerService } from "./services/url-shortener.service";
import { InMemoryUrlStore } from "./store/in-memory-url-store";
import { AppConfig, UrlStore } from "./types";

export function createApp(
  store: UrlStore = new InMemoryUrlStore(),
  config: AppConfig = getConfig(),
): Express {
  const app = express();

  app.use(express.json());

  const urlShortenerService = new UrlShortenerService(store, config);
  app.use("/", createUrlRoutes(urlShortenerService));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

const notFoundHandler: RequestHandler = (req, res) => {
  sendJsonError(res, 404, `route ${req.method} ${req.path} not found`);
};

/**
 * body-parser attaches a numeric `status` (400) to the SyntaxError it throws
 * for malformed JSON bodies, which is why the cast below is safe.
 */
function isJsonParseError(error: unknown): boolean {
  if (!(error instanceof SyntaxError)) {
    return false;
  }
  const status = (error as SyntaxError & { status?: number }).status;
  return status === 400;
}

const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (isJsonParseError(error)) {
    sendJsonError(res, 400, "request body contains invalid JSON");
    return;
  }
  if (error instanceof InvalidUrlError) {
    sendJsonError(res, 400, error.message);
    return;
  }
  sendJsonError(res, 500, "internal server error");
};