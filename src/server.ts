import { createApp } from "./app";
import { loadConfig } from "./config/environment";

const config = loadConfig();
const app = createApp({ config });

app.listen(config.port, () => {
  console.log(`URL shortener running on port ${config.port}`);
});