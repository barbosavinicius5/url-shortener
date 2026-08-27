import { createApp } from './app.js';

const DEFAULT_PORT = 3000;
const port = Number(process.env['PORT']) || DEFAULT_PORT;

const app = createApp(port);

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});