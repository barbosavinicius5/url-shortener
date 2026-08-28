# URL Shortener API

Minimal HTTP API to shorten URLs, redirect short codes to their original addresses and report access counts per code.

Built with **Node.js 20**, **TypeScript** and **Express**. Storage is exclusively **in memory** (a single `Map`): data exists only while the process is running and is lost when it stops. There is no database, Redis, file persistence, authentication or frontend.

## Requirements

- Node.js 20+
- npm

## Install

```bash
npm ci        # or: npm install
```

## Run

```bash
npm run build
npm start                # serves on http://localhost:3000

PORT=4000 npm run build && PORT=4000 npm start   # custom port
```

- `PORT` configures the TCP port (default: `3000`). Invalid values fail fast with a clear error message before the server starts.
- `shortUrl` values are derived from the effective port: `http://localhost:<PORT>/<code>`.

## API

### `POST /shorten`

Creates a new short link. The body must be JSON with a `url` field that starts with `http://` or `https://`.

```bash
curl -i -X POST http://localhost:3000/shorten \
  -H 'Content-Type: application/json' \
  -d '{"url": "https://example.com/some/long/path"}'
```

Response `201`:

```json
{ "code": "aB3x9K", "shortUrl": "http://localhost:3000/aB3x9K" }
```

- Codes have exactly 6 alphanumeric characters (`[A-Za-z0-9]`) and are unique while the process runs.
- The same URL may be sent multiple times: each call creates a new link (no deduplication).
- Missing, empty or invalid `url` returns `400` with `{ "error": "..." }`.

### `GET /:code`

Redirects (`302`) to the original URL and counts one hit.

```bash
curl -i http://localhost:3000/aB3x9K
```

- `302` with a `Location` header pointing to the original URL for existing codes.
- `404` with `{ "error": "..." }` for unknown codes.

### `GET /:code/stats`

Read-only statistics (does not change the hit counter).

```bash
curl -i http://localhost:3000/aB3x9K/stats
```

Response `200`:

```json
{ "code": "aB3x9K", "url": "https://example.com/some/long/path", "hits": 3 }
```

- `404` with `{ "error": "..." }` for unknown codes.

All error responses are JSON `{ "error": "..." }`.

## Scripts

| Command | Description |
| --- | --- |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run typecheck` | Type-check sources and tests without emitting (`tsc --noEmit`) |
| `npm test` | Run the automated tests (`vitest run`) |
| `npm start` | Start the server from `dist/server.js` |

## Testing

```bash
npm test
```

Tests use Vitest + Supertest against the exported app (no real listener), covering creation, redirect, unknown codes, invalid input, hit counting and `PORT` configuration.

## Project structure

```text
src/
  app.ts                        # Express app factory (no listen on import)
  server.ts                     # entrypoint: reads config and calls listen
  config.ts                     # PORT handling (default 3000) and baseUrl
  routes/url-routes.ts          # endpoints -> status/JSON bodies
  services/url-shortener-service.ts  # validation, code generation, redirects, stats
  store/url-store.ts            # in-memory Map storage
  types/url.ts                  # UrlRecord, CreateShortUrlResponse, StatsResponse
tests/
  url-shortener.test.ts
```

## Out of scope

By design, this service does not include: persistence (database/Redis/files), authentication, frontend, deploy, rate limiting, URL deduplication, editing/deletion/expiration of links, or analytics beyond the `hits` counter.