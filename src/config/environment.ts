export const DEFAULT_PORT = 3000;

export function getPort(env: NodeJS.ProcessEnv = process.env): number {
  const rawPort = env.PORT;
  if (rawPort === undefined || rawPort.trim() === '') return DEFAULT_PORT;
  if (!/^\d+$/.test(rawPort.trim())) throw new Error('PORT must be a positive integer between 1 and 65535');
  const port = Number(rawPort);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be a positive integer between 1 and 65535');
  }
  return port;
}

export function getBaseUrl(port: number): string {
  return `http://localhost:${port}`;
}