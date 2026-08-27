import { createApp } from './app.js';
import { getPort } from './config.js';

const port = getPort();
const app = createApp();

app.listen(port, () => {
  console.log(`URL Shortener running on http://localhost:${port}`);
});