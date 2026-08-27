import { Router, type Request, type Response } from 'express';
import { InvalidUrlError, LinkService } from '../services/link-service.js';

const NOT_FOUND_MESSAGE = 'Short code not found';

export function createLinkRouter(service: LinkService, baseUrl: string): Router {
  const router = Router();

  router.post('/shorten', (request: Request, response: Response) => {
    const body: unknown = request.body;
    if (!isObject(body) || typeof body.url !== 'string') {
      response.status(400).json({ error: 'A URL is required' });
      return;
    }

    try {
      const record = service.createLink(body.url);
      response.status(201).json({
        code: record.code,
        shortUrl: `${baseUrl}/${record.code}`,
      });
    } catch (error: unknown) {
      if (error instanceof InvalidUrlError) {
        response.status(400).json({ error: error.message });
        return;
      }
      throw error;
    }
  });

  router.get('/:code/stats', (request: Request, response: Response) => {
    const code = request.params.code;
    if (!code) {
      response.status(404).json({ error: NOT_FOUND_MESSAGE });
      return;
    }

    const stats = service.getStats(code);
    if (!stats) {
      response.status(404).json({ error: NOT_FOUND_MESSAGE });
      return;
    }
    response.status(200).json(stats);
  });

  router.get('/:code', (request: Request, response: Response) => {
    const code = request.params.code;
    if (!code) {
      response.status(404).json({ error: NOT_FOUND_MESSAGE });
      return;
    }

    const originalUrl = service.resolveAndCount(code);
    if (!originalUrl) {
      response.status(404).json({ error: NOT_FOUND_MESSAGE });
      return;
    }
    response.redirect(302, originalUrl);
  });

  return router;
}

function isObject(value: unknown): value is { url?: unknown } {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}