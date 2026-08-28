import { createApp } from './app';
import { createConfig } from './config';

const config = createConfig();
const app = createApp(config.port);

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});