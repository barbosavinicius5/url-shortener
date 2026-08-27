import { createApp } from './app.js';

const DEFAULT_PORT = 3000;

function parsePort(raw: string | undefined): number {
  if (raw === undefined) {
    return DEFAULT_PORT;
  }

  const port = Number(raw);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT value: "${raw}". Must be an integer between 1 and 65535.`);
  }

  return port;
}

const port = parsePort(process.env.PORT);
const baseUrl = `http://localhost:${port}`;

const app = createApp({ baseUrl });

app.listen(port, () => {
  console.log(`URL shortener running at ${baseUrl}`);
});