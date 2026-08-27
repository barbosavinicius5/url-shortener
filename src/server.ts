import { createApp } from './app';
import { createConfig } from './config';

const config = createConfig();
const app = createApp({ publicBaseUrl: config.publicBaseUrl });
app.listen(config.port);