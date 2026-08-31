import type { Request, Response } from 'express';
import { UrlShortenerService } from '../services/url-shortener.service';

export class RedirectController {
  public constructor(private readonly service: UrlShortenerService) {}

  public redirect = (req: Request, res: Response): void => {
    const code = this.getCode(req);
    const url = code === undefined ? undefined : this.service.resolve(code);
    if (url === undefined) {
      res.status(404).json({ error: 'Short link not found' });
      return;
    }
    res.redirect(302, url);
  };

  public stats = (req: Request, res: Response): void => {
    const code = this.getCode(req);
    const stats = code === undefined ? undefined : this.service.getStats(code);
    if (stats === undefined) {
      res.status(404).json({ error: 'Short link not found' });
      return;
    }
    res.status(200).json(stats);
  };

  private getCode(req: Request): string | undefined {
    const code = req.params.code;
    return typeof code === 'string' ? code : undefined;
  }
}