import { createApp } from "./app";

const DEFAULT_PORT = 3000;

/**
 * Resolves the port once from the environment: `PORT` must be an integer
 * between 1 and 65535; when it is unset or invalid (empty, non-numeric,
 * zero or out of range) the server deterministically falls back to 3000.
 */
export function resolvePort(rawPort: string | undefined): number {
  const parsed = Number(rawPort ?? DEFAULT_PORT);
  if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 65535) {
    return parsed;
  }
  return DEFAULT_PORT;
}

const port = resolvePort(process.env.PORT);
const app = createApp({ port });

app.listen(port, () => {
  console.log(`url-shortener listening on http://localhost:${port}`);
});