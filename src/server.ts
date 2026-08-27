import { createApp, DEFAULT_PORT } from "./app";

export function resolvePort(rawPort: string | undefined): number {
  if (rawPort === undefined || rawPort.trim() === "") {
    return DEFAULT_PORT;
  }
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(
      `invalid PORT value: "${rawPort}" (expected an integer between 1 and 65535)`
    );
  }
  return port;
}

function main(): void {
  const port = resolvePort(process.env.PORT);
  const app = createApp({ port });
  app.listen(port, () => {
    console.log(`url-shortener listening on http://localhost:${port}`);
  });
}

if (require.main === module) {
  main();
}