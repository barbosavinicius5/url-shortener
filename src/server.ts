import { createApp } from './app';

function getPort(value: string | undefined): number {
  if (value === undefined || value === '') return 3000;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }
  return port;
}

const port = getPort(process.env.PORT);
createApp(port).listen(port, () => {
  console.log(`URL shortener listening on port ${port}`);
});