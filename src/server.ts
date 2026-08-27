import { app } from './app';
import { getPort } from './config/environment';

const port = getPort();
const server = app.listen(port, () => { console.log(`URL shortener listening on port ${port}`); });
server.on('error', (error: Error) => { console.error('Failed to start server:', error.message); process.exitCode = 1; });