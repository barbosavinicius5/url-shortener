import { Request, Response } from 'express';
import { UrlShortenerService } from '../../services/url-shortener-service';
import { getBaseUrl, getPort } from '../../config/env';

export function createLinkController(
  req: Request,
  res: Response,
  service: UrlShortenerService
): void {
  const port = getPort();
  const baseUrl = getBaseUrl(port);

  try {
    // Validate payload presence
    if (req.body === undefined || req.body === null || typeof req.body !== 'object') {
      res.status(400).json({ error: 'Request body must be a JSON object.' });
      return;
    }

    const { url } = req.body;

    // Validate url field
    const validationError = service.validateUrl(url);
    if (validationError !== null) {
      res.status(400).json({ error: validationError });
      return;
    }

    const result = service.createLink(url, baseUrl);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export function redirectController(
  req: Request,
  res: Response,
  service: UrlShortenerService
): void {
  const { code } = req.params;

  if (!code || typeof code !== 'string') {
    res.status(404).json({ error: 'Link not found.' });
    return;
  }

  const destination = service.redirect(code);

  if (destination === null) {
    res.status(404).json({ error: 'Link not found.' });
    return;
  }

  res.redirect(302, destination);
}

export function statsController(
  req: Request,
  res: Response,
  service: UrlShortenerService
): void {
  const { code } = req.params;

  if (!code || typeof code !== 'string') {
    res.status(404).json({ error: 'Link not found.' });
    return;
  }

  const stats = service.getStats(code);

  if (stats === null) {
    res.status(404).json({ error: 'Link not found.' });
    return;
  }

  res.status(200).json(stats);
}