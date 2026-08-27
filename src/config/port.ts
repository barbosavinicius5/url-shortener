export const DEFAULT_PORT = 3000;

/**
 * Resolves the effective port from the raw PORT environment variable.
 * - Absent/empty PORT -> default 3000.
 * - Valid numeric PORT -> that port.
 * - Present but invalid PORT -> documented fallback to the default port
 *   (never NaN).
 */
export function parsePort(rawPort: string | undefined): number {
  if (rawPort === undefined || rawPort === "") {
    return DEFAULT_PORT;
  }
  const parsed = Number(rawPort);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return DEFAULT_PORT;
  }
  return parsed;
}