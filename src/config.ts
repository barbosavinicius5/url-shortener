export const DEFAULT_PORT = 3000;

export interface AppConfig {
  /** Effective TCP port the server listens on. */
  port: number;
  /** Local origin used to build `shortUrl` values. */
  baseUrl: string;
}

function parsePort(rawPort: string | undefined): number {
  if (rawPort === undefined || rawPort.trim() === '') {
    return DEFAULT_PORT;
  }
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(
      `Invalid PORT value "${rawPort}": PORT must be an integer between 1 and 65535.`,
    );
  }
  return port;
}

/**
 * Loads the effective configuration from the given environment.
 * Falls back to DEFAULT_PORT when PORT is absent and fails fast
 * (before the server starts) when PORT is set to an invalid value.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const port = parsePort(env.PORT);
  return {
    port,
    baseUrl: `http://localhost:${port}`,
  };
}