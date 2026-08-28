import express from 'express';
import { InMemoryUrlStore } from './store/in-memory-url-store.js';
import { UrlShortenerService } from './services/url-shortener-service.js';
import { createShortenRoutes } from './routes/shorten-routes.js';
import { createRedirectRoutes } from './routes/redirect-routes.js';
export function createApp(store, port) {
    const resolvedStore = store ?? new InMemoryUrlStore();
    const resolvedPort = port ?? resolvePort();
    const service = new UrlShortenerService(resolvedStore, resolvedPort);
    const app = express();
    // Parse JSON bodies first
    app.use(express.json());
    // Mount routes
    app.use(createShortenRoutes(service));
    app.use(createRedirectRoutes(service));
    // JSON error middleware — catch express.json() parse errors
    const errorHandler = (err, _req, res, _next) => {
        if (err.type === 'entity.parse.failed' || err.status === 400) {
            res.status(400).json({ error: 'Invalid JSON in request body' });
            return;
        }
        res.status(500).json({ error: 'Internal server error' });
    };
    app.use(errorHandler);
    return app;
}
export function resolvePort(envPort) {
    if (envPort === undefined) {
        const fromEnv = process.env.PORT;
        if (fromEnv === undefined) {
            return 3000;
        }
        const parsed = parseInt(fromEnv, 10);
        if (Number.isNaN(parsed) || parsed <= 0) {
            return 3000;
        }
        return parsed;
    }
    const parsed = parseInt(envPort, 10);
    if (Number.isNaN(parsed) || parsed <= 0) {
        return 3000;
    }
    return parsed;
}
//# sourceMappingURL=app.js.map