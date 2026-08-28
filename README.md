# url-shortener

A minimal HTTP API to **shorten** long URLs, **redirect** short codes back to
their original destination, and report **access statistics**. Built from scratch
with Node.js 20, TypeScript, Express and Vitest. All state lives in memory
(no database, Redis, filesystem or external services).

Implemented by the Factor OS agents.

## Prerequisites

- [Node.js](https://nodejs.org) 20.x
- npm (ships with Node)

## Install

```bash
npm install
```

This installs the runtime dependency (`express`) and the development tools
(`typescript`, `vitest`, `supertest` and their type definitions).

## Scripts

| Command             | Description                                              |
| ------------------- | -------------------------------------------------------- |
| `npm run build`     | Compile TypeScript to `dist/` (`tsc`).                   |
| `npm run typecheck` | Type-check the project (including tests) with `tsc --noEmit`. |
| `npm test`          | Run the test suite once, non-interactively (`vitest run`). |
| `npm start`         | Run the compiled server (`node dist/src/server.js`).      |
| `npm run dev`       | Build and run the server in one step.                     |

## Run the service

The server listens on the port defined by the `PORT` environment variable. If
`PORT` is not set, it defaults to `3000`. An invalid `PORT` (non-integer or
outside `1..65535`) causes the process to fail early with a clear message.

```bash
# default port 3000
npm run build
npm start

# or with a custom port
PORT=4100 npm start
```

You can also run without a separate build step during development:

```bash
npm run dev
```

The `shortUrl` returned by the API reflects the host and port the request was
made against, e.g. `http://localhost:3000/<code>`.

## API

### Create a short URL

`POST /shorten`

Request body (JSON):

```json
{ "url": "https://example.com/long/path" }
```

Success (`201`):

```json
{ "code": "AbC123", "shortUrl": "http://localhost:3000/AbC123" }
```

- `code` is exactly 6 alphanumeric characters (`A-Za-z0-9`) and unique among
  active shortenings.
- The same URL can produce different codes on subsequent calls.

Validation failures (`400`) — missing, empty, non-string, or non-`http`/`https`
URLs — return a JSON body with a non-empty `error`:

```json
{ "error": "Field \"url\" must use the http or https protocol." }
```

### Redirect to the original URL

`GET /:code`

- Existing code → `302` redirect to the original URL, and the `hits` counter is
  incremented exactly once.
- Unknown code → `404` with `{ "error": "Short URL not found" }`.

### Get statistics

`GET /:code/stats`

- Existing code → `200` with the record (this does **not** increment `hits`):

```json
{ "code": "AbC123", "url": "https://example.com/long/path", "hits": 1 }
```

- Unknown code → `404` with `{ "error": "Short URL not found" }`.

## Examples (curl)

```bash
# Shorten
curl -s -X POST http://localhost:3000/shorten \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com/long/path"}'
# => {"code":"AbC123","shortUrl":"http://localhost:3000/AbC123"}

# Redirect (follow with -L to see the destination)
curl -s -i http://localhost:3000/AbC123
# => HTTP/1.1 302 Found
#    Location: https://example.com/long/path

# Stats
curl -s http://localhost:3000/AbC123/stats
# => {"code":"AbC123","url":"https://example.com/long/path","hits":1}

# Bad URL
curl -s -X POST http://localhost:3000/shorten \
  -H 'Content-Type: application/json' \
  -d '{"url":"ftp://example.com"}'
# => {"error":"Field \"url\" must use the http or https protocol."}
```

## Architecture

Responsibilities are kept in separate modules:

```
src/
  app.ts                       # createApp(): wires deps + routes, no listen()
  server.ts                    # entrypoint: createApp() + app.listen(getPort())
  config/
    env.ts                     # getPort() from PORT (default 3000, validated)
  routes/
    shorten.routes.ts          # POST /shorten
    url.routes.ts              # GET /:code/stats (before) + GET /:code
  services/
    url-shortener.service.ts   # validation, code generation, hit counting
  stores/
    in-memory-url.store.ts     # Map<string, UrlRecord> wrapper
  types/
    url.ts                     # UrlRecord + DTO types
tests/
  url-shortener.integration.test.ts
```

The only persistent state is the in-memory `Map` inside
`InMemoryUrlStore`. All shortenings are lost when the process restarts.

## Tests

```bash
npm test
```

The suite covers creation + redirect (happy path), distinct codes, URL
validation (`400`), unknown-code `404` for both redirect and stats, exact hit
incrementing, and non-incrementing stats lookups. The `getPort` behaviour
(default and configured port, rejection of invalid values) is tested in
isolation.

## CI

`.github/workflows/ci.yml` runs on `ubuntu-latest` with Node 20 and executes, in
order, `npm ci`, `npm run typecheck`, `npm run build` and `npm test`. The
pipeline fails on any non-zero command exit.