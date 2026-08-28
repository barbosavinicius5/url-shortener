import { createApp } from "./app";
import { resolvePort } from "./config";

const port = resolvePort(process.env.PORT);
const app = createApp();

app.listen(port, () => {
  console.log(`URL shortener running on http://localhost:${port}`);
});