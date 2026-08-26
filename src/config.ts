export const DEFAULT_PORT = 3000;

export function resolvePort(value: string | undefined = process.env.PORT): number {
  if (value === undefined || value === '') return DEFAULT_PORT;
  if (!/^[1-9]\d*$/.test(value)) {
    throw new Error('PORT must be a positive integer');
  }
  const port = Number(value);
  if (!Number.isSafeInteger(port) || port <= 0 || port > 65535) {
    throw new Error('PORT must be a positive integer between 1 and 65535');
  }
  return port;
}