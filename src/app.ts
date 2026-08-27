import express, { type Application } from 'express';
import { InMemoryUrlStore } from './store/inMemoryUrlStore.js';
import { UrlService } from './services/urlService.js';
import { urlRoutes } from './routes/urlRoutes.js';
import { getPort, getBaseUrl } from './config.js';

export interface CreateAppOptions {
  store?: InMemoryUrlStore;
  service?: UrlService;
  baseUrl?: string;
}

export function createApp(options?: CreateAppOptions): Application {
  const app = express();
  app.use(express.json());

  let service: UrlService;
  if (options?.service) {
    service = options.service;
  } else {
    const store = options?.store ?? new InMemoryUrlStore();
    const port = getPort();
    const baseUrl = options?.baseUrl ?? getBaseUrl(port);
    service = new UrlService(store, baseUrl);
  }

  app.use(urlRoutes(service));

  return app;
}