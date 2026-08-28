const DEFAULT_PORT = 3000;

function parsePort(raw: string | undefined): number {
  if (raw === undefined || raw === '') {
    return DEFAULT_PORT;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 65535 || !Number.isInteger(parsed)) {
    return DEFAULT_PORT;
  }
  return parsed;
}

export interface Config {
  port: number;
}

export function createConfig(): Config {
  return {
    port: parsePort(process.env['PORT']),
  };
}