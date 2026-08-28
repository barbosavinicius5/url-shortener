import { createApp, DEFAULT_PORT } from './app';

function resolvePort(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === '') {
    return DEFAULT_PORT;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return DEFAULT_PORT;
  }

  return parsed;
}

const port = resolvePort(process.env.PORT);
const app = createApp({ port });

if (require.main === module) {
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`url-shortener listening on port ${port}`);
  });
}

export { app, port };