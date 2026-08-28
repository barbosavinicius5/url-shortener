import { createApp } from './app.js';
import { AppConfig, loadConfig } from './config.js';

function loadConfigOrExit(): AppConfig {
  try {
    return loadConfig();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Failed to start server: ${message}`);
    process.exit(1);
  }
}

function main(): void {
  const config = loadConfigOrExit();
  const app = createApp({ config });

  const server = app.listen(config.port, () => {
    console.log(`URL shortener API listening on ${config.baseUrl}`);
  });

  server.on('error', (error: NodeJS.ErrnoException) => {
    console.error(`Server error: ${error.message}`);
    process.exit(1);
  });
}

main();