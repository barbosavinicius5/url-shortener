export const DEFAULT_PORT = 3000;

export function getPort(portValue: string | undefined = process.env.PORT): number {
  if (portValue === undefined) {
    return DEFAULT_PORT;
  }

  if (!/^\d+$/.test(portValue)) {
    throw new Error('PORT must be a number between 1 and 65535');
  }

  const port = Number(portValue);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be a number between 1 and 65535');
  }

  return port;
}

export function getBaseUrl(port: number): string {
  return `http://localhost:${port}`;
}