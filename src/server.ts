import { getPort } from './config/env';
import { createApp } from './app';

const port = getPort();
const app = createApp({ port });

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});