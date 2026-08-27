import { createApp } from "./app";
import { parsePort } from "./config/port";

const effectivePort = parsePort(process.env["PORT"]);
const app = createApp({ port: effectivePort });

app.listen(effectivePort, () => {
  // eslint-disable-next-line no-console
  console.log(`url-shortener listening on http://localhost:${effectivePort}`);
});