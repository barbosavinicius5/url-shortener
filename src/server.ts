import { createApp } from './app.js';
import { getPort } from './config.js';

const port = getPort();
const app = createApp({ port });

app.listen(port, () => {
  console.log(`URL Shortener API running on http://localhost:${port}`);
});