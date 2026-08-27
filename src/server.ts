import { createApp } from './app';
import { InMemoryUrlStore } from './store/inMemoryUrlStore';
import { getPort } from './services/urlShortenerService';

const port = getPort();
const store = new InMemoryUrlStore();
const app = createApp(store);

app.listen(port, () => {
  console.log(`URL Shortener API running on http://localhost:${port}`);
});