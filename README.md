# URL Shortener API

Minimal HTTP API for creating temporary, in-memory short URLs, redirecting to their destinations, and viewing hit statistics. Requires **Node.js 20**.

## Install and run

```bash
npm ci # or: npm install
npm run build
npm start
```

The default port is `3000`; configure it with `PORT=4000 npm start`.

## Endpoints

Create a short URL (valid `http://` or `https://` URL only):

```bash
curl -i -X POST http://localhost:3000/shorten \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com/page"}'
```

Returns `201` with `{ "code": "abc123", "shortUrl": "http://localhost:3000/abc123" }`, or `400` with an error for invalid JSON/input.

Redirect without following it (`302`, with `Location` set to the original URL):

```bash
curl -i http://localhost:3000/abc123
```

View statistics (`200`; this does not increment hits):

```bash
curl -i http://localhost:3000/abc123/stats
```

Both lookup endpoints return `404` for an unknown code. Statistics contain only `code`, `url`, and `hits`.

## Quality checks

```bash
npm run typecheck
npm run build
npm test
```

All data is held in a process-local `Map` and is lost when the process exits. There is no external persistence.