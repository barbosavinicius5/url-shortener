const DEFAULT_PORT = 3000;

export function getPort(): number {
  const raw = process.env.PORT;
  if (raw === undefined || raw === '') {
    return DEFAULT_PORT;
  }
  const parsed = Number(raw);
  if (Number.isFinite(parsed) && Number.isInteger(parsed) && parsed > 0 && parsed <= 65535) {
    return parsed;
  }
  return DEFAULT_PORT;
}