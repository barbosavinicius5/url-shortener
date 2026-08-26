import { app } from './app';
import { resolvePort } from './config';

const port = resolvePort();
app.listen(port, () => {
  console.log(`URL shortener listening on port ${port}`);
});