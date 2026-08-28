import { createServer } from "node:http";
import { createApp } from "./app.js";
import { UrlShortenerService } from "./services/url-shortener.service.js";
import { InMemoryUrlStore } from "./stores/in-memory-url.store.js";

export const DEFAULT_PORT = 3000;

export function resolvePort(rawPort: string | undefined): number {
  if (rawPort === undefined) {
    return DEFAULT_PORT;
  }

  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }

  return port;
}

const port = resolvePort(process.env.PORT);
const baseUrl = `http://localhost:${port}`;
const service = new UrlShortenerService(new InMemoryUrlStore(), baseUrl);
const app = createApp({ service });

createServer(app).listen(port, () => {
  console.log(`URL shortener listening on ${baseUrl}`);
});