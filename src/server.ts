import { createApp } from './app';

const DEFAULT_PORT = 3000;

const portString = process.env.PORT ?? String(DEFAULT_PORT);
const port = parseInt(portString, 10);

if (isNaN(port) || port < 1 || port > 65535) {
  console.error(`Invalid PORT value: "${portString}". Must be a number between 1 and 65535.`);
  process.exit(1);
}

const { app } = createApp(port);

app.listen(port, () => {
  console.log(`URL Shortener server running on http://localhost:${port}`);
});