const DEFAULT_PORT = 3000;

export function getPort(env: Record<string, string | undefined> = process.env): number {
  const portStr = env["PORT"];

  if (portStr === undefined || portStr === "") {
    return DEFAULT_PORT;
  }

  const port = Number(portStr);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT: "${portStr}". Must be an integer between 1 and 65535.`);
  }

  return port;
}

export interface ServerConfig {
  port: number;
  baseUrl: string;
}

export function createServerConfig(env: Record<string, string | undefined> = process.env): ServerConfig {
  const port = getPort(env);
  return {
    port,
    baseUrl: `http://localhost:${port}`,
  };
}