import { createApp } from './app';
import { getConfig } from './config';

/**
 * Process entrypoint. Resolves configuration and starts listening. This is the
 * only module that calls `listen`; everything else is importable without side
 * effects for testing.
 */
function main(): void {
  const { port } = getConfig();
  const app = createApp({ port });
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`URL shortener listening on http://localhost:${port}`);
  });
}

main();