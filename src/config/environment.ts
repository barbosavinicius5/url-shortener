export const DEFAULT_PORT = 3000;

export function getPort(env: NodeJS.ProcessEnv = process.env): number {
  const configured = env.PORT;
  if (configured === undefined || configured.trim() === '') return DEFAULT_PORT;
  if (!/^\d+$/.test(configured.trim())) throw new Error('PORT must be a positive integer');
  const port = Number.parseInt(configured, 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be between 1 and 65535');
  }
  return port;
}

export function getShortUrlBase(port: number): string {
  return `http://localhost:${port}`;
}