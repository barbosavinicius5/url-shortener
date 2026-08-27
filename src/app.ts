import express, { Request, Response, NextFunction } from 'express';
import { AppConfig } from './types/url';
import { InMemoryUrlStore } from './stores/in-memory-url-store';
import { UrlShortenerService, UrlValidationError } from './services/url-shortener-service';

export function createApp(
  config?: AppConfig,
  store?: InMemoryUrlStore,
): express.Application {
  const resolvedConfig: AppConfig = config ?? { port: 3000 };
  const resolvedStore = store ?? new InMemoryUrlStore();
  const service = new UrlShortenerService(resolvedStore, resolvedConfig);

  const app = express();

  // Custom JSON body parser to handle malformed JSON
  app.use((req: Request, res: Response, next: NextFunction) => {
    express.json()(req, res, (err?: unknown) => {
      if (err) {
        if (err instanceof SyntaxError && 'body' in err) {
          res.status(400).json({ error: 'Invalid JSON body' });
          return;
        }
        next(err);
        return;
      }
      next();
    });
  });

  // POST /shorten
  app.post('/shorten', (req: Request, res: Response) => {
    try {
      const url = req.body?.url;
      const result = service.shortenUrl(url);
      res.status(201).json(result);
    } catch (err) {
      if (err instanceof UrlValidationError) {
        res.status(400).json({ error: err.message });
        return;
      }
      // Internal error (e.g., code collision exhausted)
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /:code/stats — MUST be registered before /:code
  app.get('/:code/stats', (req: Request, res: Response) => {
    const { code } = req.params;
    const record = service.getStats(code);
    if (!record) {
      res.status(404).json({ error: 'Code not found' });
      return;
    }
    res.status(200).json({
      code: record.code,
      url: record.url,
      hits: record.hits,
    });
  });

  // GET /:code — redirect
  app.get('/:code', (req: Request, res: Response) => {
    const { code } = req.params;
    const result = service.resolveCode(code);
    if (!result) {
      res.status(404).json({ error: 'Code not found' });
      return;
    }
    res.redirect(302, result.record.url);
  });

  // 404 handler for unmatched routes
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
  });

  return app;
}