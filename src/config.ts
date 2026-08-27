const DEFAULT_PORT = 3000;

export function getPort(): number {
  const envPort = process.env.PORT;
  if (envPort === undefined || envPort === '') {
    return DEFAULT_PORT;
  }
  const parsed = parseInt(envPort, 10);
  if (Number.isNaN(parsed) || parsed < 1 || parsed > 65535) {
    return DEFAULT_PORT;
  }
  return parsed;
}

export function buildShortUrl(code: string, port: number): string {
  return `http://localhost:${port}/${code}`;
}