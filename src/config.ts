export const DEFAULT_PORT = 3000;

export function getPort(env: Record<string, string | undefined> = process.env): number {
  const portStr = env.PORT;
  if (portStr === undefined || portStr === '') {
    return DEFAULT_PORT;
  }
  const port = Number(portStr);
  if (!Number.isFinite(port) || port <= 0 || port > 65535) {
    return DEFAULT_PORT;
  }
  return Math.floor(port);
}

export function getBaseUrl(port: number): string {
  return `http://localhost:${port}`;
}