import { createApp } from './app';
import { getPort } from './config/env';

const port = getPort();
const { app } = createApp();

app.listen(port, () => {
  console.log(`URL shortener server running on http://localhost:${port}`);
});