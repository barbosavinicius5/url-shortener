/**
 * Runtime configuration: resolves the listening port and the code-generation
 * constants. Kept side-effect free so tests can inject a custom environment
 * without mutating the global `process.env`.
 */

/** Default TCP port when `PORT` is not provided. */
export const DEFAULT_PORT = 3000;

/** Length of generated short codes, in characters. */
export const CODE_LENGTH = 6;

/** Alphabet used for short-code generation (A-Z, a-z, 0-9). */
export const CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export interface AppConfig {
  port: number;
}

/**
 * Resolve configuration from an environment object.
 * @param env Environment variables (defaults to `process.env`).
 * @throws Error if a provided `PORT` is not a valid TCP port (1–65535).
 */
export function getConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const raw = env.PORT;
  if (raw === undefined || raw === '') {
    return { port: DEFAULT_PORT };
  }
  const port = Number.parseInt(raw, 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(
      `Invalid PORT value "${raw}": expected an integer between 1 and 65535.`,
    );
  }
  return { port };
}