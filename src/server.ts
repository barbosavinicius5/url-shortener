import { createApp } from './app';
import { getPort } from './config';

/**
 * The only process entrypoint: reads the port, builds the app and starts
 * listening. Keeping listen out of app.ts avoids open ports and global
 * state when the app is imported (e.g. by tests).
 */
const port = getPort();
const app = createApp({ port });

app.listen(port, () => {
  // Intentionally minimal: no logging of URLs or request data.
  console.log(`url-shortener listening on http://localhost:${port}`);
});