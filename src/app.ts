import express, { ErrorRequestHandler, Request, Response } from 'express';
import { port as defaultPort } from './config';
import { shortenerRouter } from './routes/shortener.routes';
import { UrlShortenerService } from './services/url-shortener.service';
import { InMemoryUrlStore } from './stores/url.store';
import { UrlStore } from './types/url';

export function createApp(options: { port?: number; store?: UrlStore } = {}): express.Application {
  const effectivePort = options.port ?? defaultPort;
  const store = options.store ?? new InMemoryUrlStore();
  const service = new UrlShortenerService(store, effectivePort);
  const app = express();
  app.use(express.json());
  app.use(shortenerRouter(service));
  app.use((_req: Request, res: Response) => res.status(404).json({ error: 'Rota não encontrada' }));
  const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
    if (error instanceof SyntaxError && 'body' in error) return res.status(400).json({ error: 'Corpo JSON malformado' });
    if (res.headersSent) return next(error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  };
  app.use(errorHandler);
  return app;
}