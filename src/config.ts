export const DEFAULT_PORT = 3000;

export function parsePort(value: unknown): number {
  if (typeof value === "number" && Number.isInteger(value) && value > 0 && value <= 65535) {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d+$/.test(trimmed)) {
      const parsed = parseInt(trimmed, 10);
      if (parsed > 0 && parsed <= 65535) {
        return parsed;
      }
    }
  }
  return DEFAULT_PORT;
}

export interface Config {
  port: number;
}

export function getConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return {
    port: parsePort(env.PORT),
  };
}