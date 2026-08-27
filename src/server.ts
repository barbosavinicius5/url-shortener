import { createApp } from "./app";
import { DEFAULT_PORT } from "./services/urlShortenerService";

export function resolvePort(envPort: string | undefined): number {
  if (envPort === undefined || envPort.trim() === "") {
    return DEFAULT_PORT;
  }
  const parsed = Number.parseInt(envPort, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return DEFAULT_PORT;
  }
  return parsed;
}

if (require.main === module) {
  const port = resolvePort(process.env.PORT);
  const app = createApp(port);
  app.listen(port, () => {
    console.log(`url-shortener listening on http://localhost:${port}`);
  });
}