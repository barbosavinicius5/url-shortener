export const DEFAULT_PORT = 3000;

export function resolvePort(port?: string): number {
  if (port === undefined || port === null || port === "") {
    return DEFAULT_PORT;
  }
  const parsed = Number.parseInt(port, 10);
  if (Number.isNaN(parsed) || parsed < 0 || parsed > 65535) {
    throw new Error(
      `Invalid PORT value: "${port}". Expected a number between 0 and 65535.`,
    );
  }
  return parsed;
}

export function getPort(): number {
  return resolvePort(process.env.PORT);
}

export function buildBaseUrl(port: number): string {
  return `http://localhost:${port}`;
}

export function buildShortUrl(baseUrl: string, code: string): string {
  return `${baseUrl}/${code}`;
}