import { app } from './app';
import { getPort } from './config';

const port = getPort();

app.listen(port, () => {
  console.log(`URL shortener listening on http://localhost:${port}`);
});