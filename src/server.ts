import { createApp } from './app';
import { getPort } from './config';

const port = getPort();
createApp(undefined, port).listen(port, () => {
  console.log(`URL shortener listening on port ${port}`);
});