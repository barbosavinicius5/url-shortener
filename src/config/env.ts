export function getPort(env: NodeJS.ProcessEnv = process.env): number {
  const portRaw = env.PORT;
  if (portRaw === undefined || portRaw === '') {
    return 3000;
  }
  const port = parseInt(portRaw, 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(
      `Invalid PORT value: "${portRaw}". Must be an integer between 1 and 65535.`
    );
  }
  return port;
}

export function getBaseUrl(port: number): string {
  return `http://localhost:${port}`;
}