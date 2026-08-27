import { createApp } from './app';
import { getPort } from './config';

const { app, port } = createApp();

app.listen(port, () => {
  console.log(`URL shortener server listening on http://localhost:${port}`);
});