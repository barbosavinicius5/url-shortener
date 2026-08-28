export const DEFAULT_PORT = 3000;

export function resolvePort(rawPort?: string): number {
  if (rawPort === undefined || rawPort === "") {
    return DEFAULT_PORT;
  }
  const parsed = parseInt(rawPort, 10);
  if (isNaN(parsed) || parsed < 1 || parsed > 65535) {
    return DEFAULT_PORT;
  }
  return parsed;
}

export function resolveBaseUrl(port: number): string {
  return `http://localhost:${port}`;
}