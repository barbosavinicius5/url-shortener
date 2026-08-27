import { createApp } from './app';
import { InMemoryUrlStore } from './stores/in-memory-url-store';

const DEFAULT_PORT = 3000;

function resolvePort(raw: string | undefined): number {
  if (raw === undefined || raw === '') {
    return DEFAULT_PORT;
  }
  const port = Number(raw);
  if (!Number.isFinite(port) || !Number.isInteger(port) || port < 1 || port > 65535) {
    console.error(`Invalid PORT value: "${raw}". Must be a number between 1 and 65535.`);
    process.exit(1);
  }
  return port;
}

const effectivePort = resolvePort(process.env.PORT);
const store = new InMemoryUrlStore();
const app = createApp({ port: effectivePort }, store);

app.listen(effectivePort, () => {
  console.log(`Server running at http://localhost:${effectivePort}`);
});