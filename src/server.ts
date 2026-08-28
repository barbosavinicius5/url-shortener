import { createApp } from "./app";
import { getPort } from "./config";

const port = getPort();
const app = createApp({ port });

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`URL shortener listening on http://localhost:${port}`);
});