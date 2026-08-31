import { createApp, resolvePort } from './app';

const port = resolvePort();
const app = createApp(port);
app.listen(port, () => {
  console.log(`URL shortener listening on port ${port}`);
});