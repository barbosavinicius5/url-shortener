import express from 'express';
import type { Express, NextFunction, Request, Response } from 'express';
import { createUrlRoutes } from './routes/urlRoutes';
import { InMemoryUrlStore } from './store/inMemoryUrlStore';
import { createUrlService } from './services/urlService';
import type { UrlService } from './services/urlService';
import { generateCode } from './services/codeGenerator';
import type { CodeGenerator } from './services/codeGenerator';
import type { UrlStore } from './types/url';

export const DEFAULT_PORT = 3000;

export interface CreateAppOptions {
  /** Port used to build `shortUrl` (`http://localhost:<port>`). Default 3000. */
  port?: number;
  /** Custom store; a fresh InMemoryUrlStore is created when omitted. */
  store?: UrlStore;
  /** Fully built service; composed from store + port when omitted. */
  urlService?: UrlService;
  /** Injectable code generator for deterministic tests. */
  codeGenerator?: CodeGenerator;
}

/**
 * Creates the Express application without starting a listener. server.ts owns
 * app.listen, so importing this module never produces side effects.
 */
export function createApp(options: CreateAppOptions = {}): Express {
  const port = options.port ?? DEFAULT_PORT;
  const store = options.store ?? new InMemoryUrlStore();
  const urlService =
    options.urlService ??
    createUrlService(store, {
      baseUrl: `http://localhost:${port}`,
      codeGenerator: options.codeGenerator ?? generateCode
    });

  const app = express();
  app.use(express.json());
  app.use(createUrlRoutes(urlService));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: 'Short URL not found' });
}

interface ErrorWithStatus extends Error {
  status?: number;
  statusCode?: number;
}

function isErrorWithStatus(err: unknown): err is ErrorWithStatus {
  return err instanceof Error && ('status' in err || 'statusCode' in err);
}

function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  if (res.headersSent) {
    next(err);
    return;
  }
  const status = isErrorWithStatus(err)
    ? err.status ?? err.statusCode ?? 500
    : 500;
  if (status === 400) {
    // Malformed JSON bodies rejected by express.json().
    res.status(400).json({ error: 'Malformed JSON body' });
    return;
  }
  res.status(500).json({ error: 'Internal server error' });
}