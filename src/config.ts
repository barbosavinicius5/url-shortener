export const DEFAULT_PORT = 3000;

export function resolvePort(): number {
  const raw = process.env.PORT;
  if (raw === undefined || raw === "") {
    return DEFAULT_PORT;
  }
  const port = Number(raw);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid PORT value: ${raw}. Must be a positive integer between 1 and 65535.`);
  }
  return port;
}