import { createApp, resolvePort } from './app.js';

const port = resolvePort();

const app = createApp();

app.listen(port, () => {
  console.log(`URL shortener service running on http://localhost:${port}`);
});