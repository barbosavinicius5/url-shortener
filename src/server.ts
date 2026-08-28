import { createApp } from "./app";
import { parsePort } from "./config";

const port = parsePort(process.env.PORT);
const app = createApp({ port });

app.listen(port, () => {
  console.log(`URL shortener running on http://localhost:${port}`);
});