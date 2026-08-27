import { app, createApp } from './app.js';
import { UrlShortenerService } from './services/url-shortener-service.js';
import { UrlStore } from './store/url-store.js';

export const DEFAULT_PORT = 3000;

export function resolvePort(value: string | undefined): number {
  if (!value) return DEFAULT_PORT;
  const port = Number(value);
  return Number.isInteger(port) && port > 0 && port <= 65535 ? port : DEFAULT_PORT;
}

const port = resolvePort(process.env.PORT);
const serverApp = createApp({
  service: new UrlShortenerService(new UrlStore()),
  baseUrl: `http://localhost:${port}`,
});

if (process.env.NODE_ENV !== 'test') {
  serverApp.listen(port, () => {
    console.log(`URL shortener listening on port ${port}`);
  });
}

export { app };