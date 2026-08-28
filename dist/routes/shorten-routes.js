import { Router } from 'express';
export function createShortenRoutes(service) {
    const router = Router();
    router.post('/shorten', (req, res) => {
        const body = req.body;
        const url = body?.url;
        const result = service.create(url);
        if (!result.ok) {
            res.status(400).json({ error: result.error });
            return;
        }
        res.status(201).json(result.value);
    });
    return router;
}
//# sourceMappingURL=shorten-routes.js.map