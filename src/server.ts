import { createApp } from './app';
import { resolveConfig } from './config';

const config = resolveConfig();
const { app } = createApp(config);

app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
});