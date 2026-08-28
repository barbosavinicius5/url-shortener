import { Router, type Request, type Response } from 'express';

import { InvalidUrlError, UrlShortenerService } from '../services/url-shortener.service';

/** Builds the `POST /shorten` router for a given service instance. */
export function createShortenRouter(service: UrlShortenerService): Router {
  const router = Router();

  router.post('/shorten', (req: Request, res: Response) => {
    // Narrow `req.body` (typed as `unknown` from the framework) to find `url`.
    const body: unknown = req.body;
    let url: unknown = undefined;
    if (typeof body === 'object' && body !== null) {
      url = (body as Record<string, unknown>).url;
    }

    try {
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const result = service.create(url, baseUrl);
      res.status(201).json(result);
    } catch (err) {
      if (err instanceof InvalidUrlError) {
        res.status(400).json({ error: err.message });
        return;
      }
      // Unexpected error: let the global error handler deal with it.
      throw err;
    }
  });

  return router;
}