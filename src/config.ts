export const DEFAULT_PORT = 3000;

export function parsePort(value: string | undefined): number {
  if (value === undefined || value.trim() === '') return DEFAULT_PORT;
  if (!/^[1-9]\d*$/.test(value)) throw new Error('PORT must be an integer between 1 and 65535');
  const port = Number(value);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }
  return port;
}

export function createConfig(value: string | undefined = process.env.PORT) {
  const port = parsePort(value);
  return { port, publicBaseUrl: `http://localhost:${port}` };
}