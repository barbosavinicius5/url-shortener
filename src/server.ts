import { createApp } from './app';
import { port } from './config';

createApp({ port }).listen(port, () => {
  console.log(`Servidor ouvindo em http://localhost:${port}`);
});