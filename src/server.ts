import { createApp } from "./app";
import { getConfig } from "./config";

const config = getConfig();
const app = createApp({ port: config.port });

const server = app.listen(config.port, () => {
  console.log(`URL Shortener server running on port ${config.port}`);
});

export default server;