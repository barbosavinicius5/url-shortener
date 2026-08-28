export interface AppConfig {
  port: number;
  baseUrl: string;
}

const DEFAULT_PORT = 3000;

function parsePort(raw: string | undefined): number {
  if (raw === undefined || raw === "") {
    return DEFAULT_PORT;
  }

  const port = Number(raw);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(
      `Invalid PORT value: "${raw}". PORT must be an integer between 1 and 65535.`
    );
  }

  return port;
}

export function loadConfig(): AppConfig {
  const port = parsePort(process.env.PORT);
  return {
    port,
    baseUrl: `http://localhost:${port}`,
  };
}