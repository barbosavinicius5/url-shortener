import { createApp } from "./app";
import { getPort } from "./config";

const port = getPort();
const app = createApp({ port });

app.listen(port, () => {
  console.log(`URL shortener service running on port ${port}`);
});