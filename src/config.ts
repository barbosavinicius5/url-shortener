export const DEFAULT_PORT = 3000;

/**
 * Resolve the listening port from the environment.
 *
 * When PORT is absent, the default port (3000) is used. When present, it must
 * be an integer between 1 and 65535; any other value fails early with an
 * explicit error instead of producing an incorrect shortUrl base.
 */
export function getPort(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.PORT;

  if (raw === undefined || raw === "") {
    return DEFAULT_PORT;
  }

  const port = Number(raw);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(
      `Invalid PORT value "${raw}". It must be an integer between 1 and 65535.`,
    );
  }

  return port;
}