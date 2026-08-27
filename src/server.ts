import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import type { Server } from 'node:http';
import { createApp } from './app.js';

export function resolvePort(rawPort: string | undefined = process.env.PORT): number {
  const value = rawPort ?? '3000';
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }
  return port;
}

export function createServer(port = resolvePort()): Server {
  return createApp({ port }).listen(port, () => {
    console.log(`URL shortener listening on port ${port}`);
  });
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? resolve(process.argv[1]) : undefined;
if (invokedFile === currentFile) {
  createServer();
}