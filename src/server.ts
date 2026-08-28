import { getPort } from './config/environment';
import { createApp } from './app';

const port = getPort();
const app = createApp({ port });

app.listen(port, () => {
  console.log(`URL shortener listening at http://localhost:${port}`);
});