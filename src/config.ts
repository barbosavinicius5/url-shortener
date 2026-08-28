import { AppConfig } from "./types";

export const DEFAULT_PORT = 3000;

const MIN_PORT = 1;
const MAX_PORT = 65535;

export function getConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return { port: parsePort(env.PORT) };
}

function parsePort(rawPort: string | undefined): number {
  if (rawPort === undefined) {
    return DEFAULT_PORT;
  }

  const parsedPort = Number(rawPort);
  if (!Number.isInteger(parsedPort) || parsedPort < MIN_PORT || parsedPort > MAX_PORT) {
    return DEFAULT_PORT;
  }

  return parsedPort;
}