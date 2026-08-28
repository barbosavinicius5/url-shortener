import { createApp } from './app.js';
import { getBaseUrl, getPort } from './config.js';

const port = getPort();
const app = createApp(undefined, getBaseUrl(port));

app.listen(port, () => {
  console.log(`URL shortener listening on port ${port}`);
});