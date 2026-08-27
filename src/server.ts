import { createApp } from './app.js';
import { InMemoryUrlStore } from './store/in-memory-url.store.js';

const DEFAULT_PORT = 3000;

function parsePort(rawPort: string | undefined): number {
  if (rawPort === undefined || rawPort === '') {
    return DEFAULT_PORT;
  }

  const port = Number(rawPort);

  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    console.error(`Invalid PORT value: "${rawPort}". Must be an integer between 1 and 65535.`);
    process.exit(1);
  }

  return port;
}

const port = parsePort(process.env.PORT);
const store = new InMemoryUrlStore();
const app = createApp({ store, port });

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});