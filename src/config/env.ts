/**
 * Pure configuration helpers. No side effects: the caller decides what to do
 * with invalid values.
 */

export const DEFAULT_PORT = 3000;

/**
 * Resolves the HTTP port from the given environment.
 *
 * - Missing PORT (undefined or empty string) falls back to 3000.
 * - PORT must be an integer between 1 and 65535, without surrounding
 *   whitespace.
 * - Invalid values throw a configuration error instead of silently falling
 *   back.
 */
export function getPort(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.PORT;

  if (raw === undefined || raw === '') {
    return DEFAULT_PORT;
  }

  if (raw.trim() !== raw) {
    throw new Error(
      `Invalid PORT value: "${raw}". PORT must be an integer between 1 and 65535.`
    );
  }

  const port = Number(raw);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(
      `Invalid PORT value: "${raw}". PORT must be an integer between 1 and 65535.`
    );
  }

  return port;
}

/** Base URL used to compose shortUrl responses (localhost based). */
export function getBaseUrl(port: number): string {
  return `http://localhost:${port}`;
}