import express, { ErrorRequestHandler, Express } from 'express';
import { InMemoryUrlStore } from './store/in-memory-url.store';
import { createShorteningRouter } from './routes/shortening.routes';
import { ShorteningService } from './services/shortening.service';

export function createApp(port: number, store: InMemoryUrlStore = new InMemoryUrlStore()): Express {
  const app = express();
  const service = new ShorteningService(store);
  app.use(express.json());
  app.use(createShorteningRouter(service, port));
  const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
    const message = error instanceof Error ? error.message : 'Invalid request body';
    res.status(400).json({ error: message || 'Invalid request body' });
  };
  app.use(errorHandler);
  return app;
}

export const app = createApp(3000);
