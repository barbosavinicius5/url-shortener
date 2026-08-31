import type { Request, Response } from 'express';
import { UrlShortenerService } from '../services/url-shortener.service';

export class ShortenController {
  public constructor(private readonly service: UrlShortenerService) {}

  public create = (req: Request, res: Response): void => {
    const body: unknown = req.body;
    const url = this.extractUrl(body);
    if (url === undefined) {
      res.status(400).json({ error: 'URL must be a valid HTTP or HTTPS URL' });
      return;
    }
    try {
      res.status(201).json(this.service.shorten(url));
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'URL must be a valid HTTP or HTTPS URL') {
        res.status(400).json({ error: error.message });
        return;
      }
      throw error;
    }
  };

  private extractUrl(body: unknown): string | undefined {
    if (typeof body !== 'object' || body === null || !('url' in body)) return undefined;
    const candidate = body.url;
    return typeof candidate === 'string' ? candidate : undefined;
  }
}