import { createApp } from './app';
import { getPort } from './config/env';
import { InMemoryUrlStore } from './storage/in-memory-url.store';

function bootstrap(): void {
  try {
    const port = getPort();
    const store = new InMemoryUrlStore();
    const app = createApp(store, { port });

    app.listen(port, () => {
      console.log(`URL shortener listening on http://localhost:${port}`);
    });
  } catch (error) {
    console.error(
      'Failed to start server:',
      error instanceof Error ? error.message : error
    );
    process.exit(1);
  }
}

bootstrap();