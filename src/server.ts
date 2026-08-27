import { createApp } from './app';
import { getPort } from './config';

const port = getPort();
const app = createApp({ port });

app.listen(port, () => {
  console.log(`URL Shortener server running at http://localhost:${port}`);
});