/**
 * Resolves the TCP port the HTTP server should listen on.
 *
 * Reads the `PORT` environment variable. When absent (or blank) the default
 * port `3000` is used. When present but not a valid integer in the range
 * `1..65535`, the function fails early instead of starting on an unexpected
 * port.
 */
export function getPort(): number {
  const raw = process.env.PORT;

  if (raw === undefined) {
    return 3000;
  }

  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return 3000;
  }

  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(
      `Invalid PORT environment variable: "${raw}". Port must be an integer between 1 and 65535.`,
    );
  }

  return parsed;
}