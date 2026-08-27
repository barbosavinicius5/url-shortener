import { app } from './app';
import { DEFAULT_PORT } from './services/url-shortener';

export function resolvePort(value: string | undefined): number {
  if (value === undefined || value.trim() === '') return DEFAULT_PORT;
  if (!/^\d+$/.test(value)) throw new Error('PORT must be an integer between 1 and 65535');
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }
  return port;
}

if (require.main === module) {
  const effectivePort = resolvePort(process.env.PORT);
  const server = app.listen(effectivePort, () => {
    console.log(`URL shortener listening on port ${effectivePort}`);
  });
  server.on('error', (error) => {
    console.error('Unable to start server:', error);
    process.exitCode = 1;
  });
}