import { createApp } from './app';
import { getPort, getShortUrlBase } from './config';

const port = getPort();
const app = createApp({ port });
const base = getShortUrlBase(port);

app.listen(port, () => {
  console.log(`URL Shortener API running at ${base}`);
});