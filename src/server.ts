import { createApp, AppConfig } from "./app";
import { resolvePort, DEFAULT_PORT } from "./config";

const port = resolvePort();
const config: AppConfig = { port };
const app = createApp(config);

app.listen(port, () => {
  console.log(`URL shortener running on http://localhost:${port}`);
});