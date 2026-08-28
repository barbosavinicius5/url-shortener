import { app, resolvePort } from './app';

const port = resolvePort();

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`URL shortener server listening on port ${port}`);
});