export const DEFAULT_PORT = 3000;

function resolvePort(value: string | undefined): number {
  if (value === undefined || value.trim() === '') return DEFAULT_PORT;
  const port = Number(value);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error('PORT deve ser um inteiro positivo entre 1 e 65535');
  }
  return port;
}

export const port: number = resolvePort(process.env.PORT);

export function getConfigPort(): number {
  return resolvePort(process.env.PORT);
}