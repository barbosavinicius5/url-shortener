import type { AppConfig } from './types/url.js';

export const DEFAULT_PORT = 3000;

const MIN_PORT = 1;
const MAX_PORT = 65535;

/**
 * Resolves the HTTP port from a raw `PORT` environment value.
 * Missing or empty values fall back to the default port; invalid values fail fast
 * instead of silently starting on an unexpected port.
 */
export function resolvePort(rawPort: string | undefined): number {
  if (rawPort === undefined || rawPort.trim() === '') {
    return DEFAULT_PORT;
  }

  const parsed = Number(rawPort);
  if (!Number.isInteger(parsed) || parsed < MIN_PORT || parsed > MAX_PORT) {
    throw new Error(
      `Invalid PORT value: "${rawPort}". PORT must be an integer between ${MIN_PORT} and ${MAX_PORT}, or empty to use the default (${DEFAULT_PORT}).`,
    );
  }

  return parsed;
}

/** Builds the application configuration from an environment-like record. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const port = resolvePort(env.PORT);
  return {
    port,
    baseUrl: `http://localhost:${port}`,
  };
}