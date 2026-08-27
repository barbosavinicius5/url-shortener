import { app, createApp } from './app';
import { InMemoryUrlStore } from './store/in-memory-url.store';

export const DEFAULT_PORT = 3000;

export function resolvePort(value: string | undefined = process.env.PORT): number {
  if (!value) return DEFAULT_PORT;
  const port = Number.parseInt(value, 10);
  return Number.isInteger(port) && port >= 1 && port <= 65535 && String(port) === value.trim()
    ? port
    : DEFAULT_PORT;
}

if (require.main === module) {
  const port = resolvePort();
  const serverApp = createApp(port, new InMemoryUrlStore());
  serverApp.listen(port, () => {
    console.log(`URL shortener listening on port ${port}`);
  });
}

export { app };
