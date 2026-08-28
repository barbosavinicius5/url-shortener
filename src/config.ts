export interface AppConfig {
  port: number;
  baseUrl: string;
}

export function resolveConfig(env: Record<string, string | undefined> = process.env): AppConfig {
  const raw = env.PORT;
  let port = 3000;

  if (raw !== undefined && raw !== '') {
    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
      throw new Error(`Invalid PORT value: "${raw}". Must be an integer between 1 and 65535.`);
    }
    port = parsed;
  }

  return {
    port,
    baseUrl: `http://localhost:${port}`,
  };
}