# url-shortener

Minimal HTTP URL shortening service built with Node.js 20, TypeScript and Express. All data is kept in memory (a `Map`) — there is no database, Redis or file persistence, by design.

## Installation

```bash
npm install
```

## Running

```bash
npm run build
npm start
```

Or directly:

```bash
node dist/server.js
```

### Port configuration

The service uses the `PORT` environment variable; the default is `3000`.

```bash
PORT=8080 node dist/server.js
```

The `shortUrl` returned by `POST /shorten` reflects the effective configured port (default `http://localhost:3000/<code>`).

## API

### `POST /shorten`

Creates a short URL. Body: `{ "url": "https://example.com/page" }`.

```bash
curl -X POST http://localhost:3000/shorten \
  -H 'Content-Type: application/json' \
  -d '{"url": "https://example.com/page"}'
```

Response `201`:

```json
{
  "code": "aB3xY9",
  "shortUrl": "http://localhost:3000/aB3xY9"
}
```

Errors — `400` with `{ "error": "..." }` when the `url` field is missing or does not start with `http://` or `https://`.

### `GET /:code`

Redirects (`302`) to the original URL registered for the code. Each successful redirect increments the `hits` counter of the code. Returns `404` when the code does not exist.

```bash
curl -i http://localhost:3000/aB3xY9
```

### `GET /:code/stats`

Returns statistics for a code. Querying stats does not count as an access. Returns `404` when the code does not exist.

```bash
curl http://localhost:3000/aB3xY9/stats
```

Response `200`:

```json
{
  "code": "aB3xY9",
  "url": "https://example.com/page",
  "hits": 0
}
```

## Tests

```bash
npm test
```

## Type checking and build

```bash
npm run typecheck
npm run build
```

## Project structure

```text
src/
  app.ts                        # Express composition, exports app/createApp
  server.ts                     # Bootstrap and listen on the configured port
  config.ts                     # PORT resolution (default 3000)
  types/url.ts                  # UrlRecord and response DTOs
  storage/in-memory-url-store.ts # Map-based in-memory store
  services/url-shortener-service.ts # Validation, code generation, use cases
  routes/url-routes.ts          # POST /shorten, GET /:code/stats, GET /:code
tests/
  url-shortener.test.ts         # Integration tests via Supertest
```

## Notes

- Data lives only in memory: restarting the process discards all short URLs and counters, by explicit design.
- Repeated submissions of the same URL may create different codes (no deduplication).
- There is no authentication, frontend, persistence, deploy, rate limiting, expiration, editing or removal.