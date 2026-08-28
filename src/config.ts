export const DEFAULT_PORT = 3000;

export function getPort(env: Record<string, string | undefined> = process.env): number {
  const raw = env["PORT"];
  if (raw === undefined || raw === "") {
    return DEFAULT_PORT;
  }
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 65535) {
    throw new Error(
      `Invalid PORT value: "${raw}". Expected an integer between 0 and 65535.`
    );
  }
  return parsed;
}