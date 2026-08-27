export const DEFAULT_PORT = 3000;

/**
 * Reads the effective port from the environment.
 *
 * - When PORT is not set, returns DEFAULT_PORT (3000).
 * - When PORT is set, it must be a valid integer between 1 and 65535;
 *   otherwise this function fails fast with a clear error, so the port
 *   used by app.listen can never silently diverge from the shortUrl base.
 */
export function getPort(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.PORT;
  if (raw === undefined || raw === '') {
    return DEFAULT_PORT;
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(
      `Invalid PORT value: "${raw}". PORT must be an integer between 1 and 65535.`,
    );
  }

  return parsed;
}