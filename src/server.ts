import { createApp } from './app';

const DEFAULT_PORT = 3000;

function validatePort(value: string | undefined): number {
  const port = Number(value ?? DEFAULT_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT: ${value}. Must be an integer between 1 and 65535.`);
  }
  return port;
}

const port = validatePort(process.env.PORT);
const baseUrl = `http://localhost:${port}`;

const app = createApp({ baseUrl });

app.listen(port, () => {
  console.log(`Server running at ${baseUrl}`);
});