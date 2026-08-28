import { createApp, resolvePort } from './app';

const port = resolvePort();
const app = createApp(undefined, port);

app.listen(port, () => {
  console.log(`URL shortener listening on http://localhost:${port}`);
});