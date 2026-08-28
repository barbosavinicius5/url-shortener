import { createApp } from "./app";

export const DEFAULT_PORT = 3000;

export function resolvePort(rawPort: string | undefined): number {
  if (rawPort === undefined) {
    return DEFAULT_PORT;
  }

  const port = Number(rawPort);
  if (Number.isInteger(port) && port >= 1 && port <= 65535) {
    return port;
  }

  return DEFAULT_PORT;
}

function start(): void {
  const port = resolvePort(process.env.PORT);
  const app = createApp({ port });

  app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
}

if (require.main === module) {
  start();
}