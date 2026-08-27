export const DEFAULT_PORT = 3000;

export function getPort(env: NodeJS.ProcessEnv = process.env): number {
  const value = env.PORT;
  if (value === undefined || value === '') return DEFAULT_PORT;
  if (!/^\d+$/.test(value)) throw new Error('PORT must be a positive integer');
  const port = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(port) || port <= 0 || port > 65535) throw new Error('PORT must be a positive integer');
  return port;
}