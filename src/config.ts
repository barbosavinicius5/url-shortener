export interface Config {
  port: number;
}

export function getPort(env: Record<string, string | undefined> = process.env): number {
  const portStr = env['PORT'];
  if (portStr === undefined || portStr === '') {
    return 3000;
  }
  const port = Number(portStr);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`PORT must be a positive integer between 1 and 65535, got "${portStr}"`);
  }
  return port;
}

export function getBaseUrl(port: number): string {
  return `http://localhost:${port}`;
}