const DEFAULT_PORT = 3000;

export function parsePort(value: string | undefined): number {
  if (value === undefined || value === "") {
    return DEFAULT_PORT;
  }
  const port = Number.parseInt(value, 10);
  if (Number.isNaN(port) || port <= 0 || port > 65535) {
    return DEFAULT_PORT;
  }
  return port;
}

export { DEFAULT_PORT };