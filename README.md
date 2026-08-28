# URL Shortener

A minimal HTTP API that shortens URLs, redirects short codes to their original
destination and exposes basic hit statistics. All data lives **in memory** for
the lifetime of the process — restarting the service clears every record.

## Stack

- Node.js 20 (`engines.node`: `>=20 <21`)
- TypeScript 5.8 (compiled to CommonJS in `dist/`)
- Express 5
- Vitest + Supertest for tests

## Installation

```bash
npm ci
# or
npm install
```

## Running

```bash
npm start        # node dist/src/server.js (build first with npm run build)
```

The service listens on `http://localhost:3000` by default.

### Configuration

The port is read once at startup from the `PORT` environment variable.
When `PORT` is not set (or empty), the default is `3000`. Values must be
integers between `1` and `65535`; invalid values make the process exit with an
error instead of silently falling back.

The `shortUrl` returned by `POST /shorten` always reflects the effective port.

## API

### Create — `POST /shorten`

```bash
curl -i -X POST http://localhost:3000/shorten \
  -H 'Content-Type: application/json' \
  -d '{"url": "https://example.com/page"}'
```

Response — `201 Created`:

```json
{
  "code": "aB3xY9",
  "shortUrl": "http://localhost:3000/aB3xY9"
}
```

- Codes are alphanumeric, exactly 6 characters, and unique among the
  shortening records currently in memory.
- The same URL may be shortened again and receive a different code
  (no deduplication).

Errors — `400 Bad Request` with `{ "error": "..." }` when the body is not a
usable JSON object, when `url` is missing/not a string/empty, when the URL is
malformed, or when the scheme is not `http://` / `https://`.

### Redirect — `GET /:code`

```bash
curl -i http://localhost:3000/aB3xY9
```

- `302 Found` with a `Location` header pointing to the original URL.
- Every successful redirect increments the code's `hits` counter exactly once.
- `404 Not Found` with `{ "error": "Short URL not found" }` when the code does
  not exist.

### Stats — `GET /:code/stats`

```bash
curl -i http://localhost:3000/aB3xY9/stats
```

Response — `200 OK`:

```json
{
  "code": "aB3xY9",
  "url": "https://example.com/page",
  "hits": 2
}
```

- Reading stats never changes `hits`.
- `404 Not Found` when the code does not exist.

Other unknown paths return `404` with `{ "error": "Not found" }`.

## Scripts

| Script                | Command          | Description                       |
| --------------------- | ---------------- | --------------------------------- |
| `npm run build`       | `tsc`            | Compiles TypeScript to `dist/`    |
| `npm run typecheck`   | `tsc --noEmit`   | Type-checks source and tests      |
| `npm test`            | `vitest run`     | Runs the test suite (no network)  |
| `npm start`           | `node dist/src/server.js` | Starts the compiled server |

## Tests

```bash
npm test
```

Tests use Vitest + Supertest against the Express app **without opening a
socket**. They cover the create/redirect happy path, unknown codes (`404`),
invalid input (`400`), hit counting (redirects increment, stats do not), code
collision retry and port configuration.

## Project layout

```text
src/
├── app.ts                        # express.json, route registration, error handling
├── server.ts                     # bootstrap: PORT + listen
├── config/env.ts                 # getPort/getBaseUrl (pure helpers)
├── routes/shortening.routes.ts   # HTTP contracts for the three endpoints
├── services/url-shortener.service.ts # validation, code generation, rules
├── storage/in-memory-url.store.ts    # Map-based in-memory store
└── types/url.types.ts            # shared contracts
tests/
├── shortening.api.test.ts        # HTTP integration (Supertest)
└── url-shortener.service.test.ts # unit tests for rules and config
```

## Out of scope

Authentication, persistence (database/Redis/files), frontend, deploy, rate
limiting, deduplication, editing/deleting/expiring links and any statistics
beyond `hits`.