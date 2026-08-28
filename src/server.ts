import { createApp } from './app';
import { getPort } from './config/env';

// This module is the process entrypoint: it is the ONLY place that starts the
// HTTP server. Importing `app` (or any other module) in tests will not open a
// socket as a side effect.
const app = createApp();
const port = getPort();

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`URL shortener API listening on port ${port}`);
});