import { createApp } from "./app";
import { getConfig } from "./config";
import { InMemoryUrlStore } from "./store/in-memory-url-store";

const config = getConfig();
const app = createApp(new InMemoryUrlStore(), config);

const server = app.listen(config.port, () => {
  console.log(`url-shortener API listening on http://localhost:${config.port}`);
});

export default server;