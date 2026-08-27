import express, { type ErrorRequestHandler, type Express } from 'express';
import { createLinkRouter } from './routes/link-routes.js';
import { LinkService } from './services/link-service.js';
import { InMemoryLinkStore } from './store/in-memory-link-store.js';
import type { LinkStore } from './domain/link.js';

export interface AppOptions {
  port?: number;
  baseUrl?: string;
  store?: LinkStore;
  service?: LinkService;
}

export function createApp(options: AppOptions = {}): Express {
  const app = express();
  const service = options.service ?? new LinkService(options.store ?? new InMemoryLinkStore());
  const baseUrl = (options.baseUrl ?? `http://localhost:${options.port ?? 3000}`).replace(/\/$/, '');

  app.use(express.json());
  app.use(createLinkRouter(service, baseUrl));
  app.use(jsonErrorHandler);

  return app;
}

const jsonErrorHandler: ErrorRequestHandler = (error, _request, response, next) => {
  if (error instanceof SyntaxError && 'body' in error) {
    response.status(400).json({ error: 'Malformed JSON body' });
    return;
  }
  next(error);
};