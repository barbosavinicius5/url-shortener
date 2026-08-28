export const DEFAULT_PORT = 3000;

export function getPort(env: NodeJS.ProcessEnv = process.env): number {
  const rawPort = env.PORT;

  if (rawPort === undefined || rawPort === '') {
    return DEFAULT_PORT;
  }

  const trimmed = rawPort.trim();
  if (trimmed === '' || !/^\d+$/.test(rawPort)) {
    throw new Error(`Invalid PORT "${rawPort}". PORT must be an integer between 1 and 65535.`);
  }

  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT "${rawPort}". PORT must be an integer between 1 and 65535.`);
  }

  return port;
}