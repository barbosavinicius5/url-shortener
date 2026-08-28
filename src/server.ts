import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { UrlShortenerService } from './services/url-shortener.service.js';
import { createUrlStore } from './store/url.store.js';

/**
 * Production entrypoint: the only place that reads the real environment,
 * wires the dependencies together and starts the HTTP listener.
 */
function main(): void {
  const config = loadConfig();
  const store = createUrlStore();
  const service = new UrlShortenerService(store, config);
  const app = createApp(service);

  const server = app.listen(config.port, () => {
    console.log(`URL shortener listening on http://localhost:${config.port}`);
  });

  const shutdown = (): void => {
    server.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main();