import express from 'express';
import { ShortenerService } from './services/shortener-service';
import { LinkStore } from './stores/link-store';
import { createLinksRouter } from './routes/links';
import { getPort } from './config';

export interface CreateAppOptions {
  port?: number;
  service?: ShortenerService;
}

export function createApp(options?: CreateAppOptions) {
  const port = options?.port ?? getPort();
  const store = new LinkStore();
  const service = options?.service ?? new ShortenerService(store, port);

  const app = express();
  app.use(express.json());
  app.use(createLinksRouter(service));

  return app;
}