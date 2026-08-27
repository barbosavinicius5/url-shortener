import { createApp } from './app';
import { getPort } from './config';

try {
  const port = getPort();
  createApp({ port }).listen(port, () => console.log(`URL shortener listening on port ${port}`));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
