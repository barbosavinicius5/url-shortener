const DEFAULT_PORT = 3000;

export function getPort(): number {
  return Number(process.env.PORT ?? DEFAULT_PORT);
}

export const port = getPort();