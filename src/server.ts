import { createApp } from "./app.js";
import { createServerConfig } from "./config.js";

const config = createServerConfig();
const app = createApp(config);

app.listen(config.port, () => {
  console.log(`Server running at http://localhost:${config.port}`);
});