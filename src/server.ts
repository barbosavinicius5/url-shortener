import { createApp, DEFAULT_PORT } from './app';

const MIN_PORT = 1;
const MAX_PORT = 65535;

function parsePort(raw: string | undefined): number {
  const value = raw ?? String(DEFAULT_PORT);
  const port = Number(value);
  if (!Number.isInteger(port) || port < MIN_PORT || port > MAX_PORT) {
    throw new Error(
      `Invalid PORT configuration: "${value}". PORT must be an integer between ${MIN_PORT} and ${MAX_PORT}.`
    );
  }
  return port;
}

function main(): void {
  const port = parsePort(process.env.PORT);
  const app = createApp({ port });
  app.listen(port, () => {
    console.log(`URL shortener listening on http://localhost:${port}`);
  });
}

main();