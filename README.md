# url-shortener

A minimal in-memory HTTP API for shortening and redirecting URLs, built with
Node.js 20, TypeScript and Express.

## Features

- `POST /shorten` — creates a short code for a valid HTTP(S) URL.
- `GET /:code` — redirects (`302`) to the original URL and increments the hit
  counter.
- `GET /:code/stats` — returns the code, the original URL and the number of
  hits.

All data is kept **in memory** (a `Map`) for the lifetime of the process —
there is no database, Redis or disk persistence.

## Requirements

- Node.js 20+
- npm

## Installation

```bash
npm install
```

## Running

```bash
npm run build
npm start
```

Or in development mode:

```bash
npm run dev
```

The server listens on port `3000` by default. Set the `PORT` environment
variable to change it:

```bash
PORT=4310 npm start
```

The port used to start the server is also the port embedded in the
`shortUrl` returned by `POST /shorten`.

## API

### `POST /shorten`

Request:

```bash
curl -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/page"}'
```

Response (`201`):

```json
{ "code": "aB3xY9", "shortUrl": "http://localhost:3000/aB3xY9" }
```

Invalid input (missing, empty or not starting with `http://`/`https://`)
returns `400` with `{ "error": "..." }`.

### `GET /:code`

```bash
curl -i http://localhost:3000/aB3xY9
```

Returns `302` with a `Location` header pointing to the original URL and
increments the hit counter. Unknown codes return `404` with
`{ "error": "short URL not found" }`.

### `GET /:code/stats`

```bash
curl http://localhost:3000/aB3xY9/stats
```

Response (`200`):

```json
{ "code": "aB3xY9", "url": "https://example.com/page", "hits": 3 }
```

Consulting stats never increments the counter. Unknown codes return `404`.

## Scripts

- `npm run build` — compile TypeScript to `dist/`.
- `npm run typecheck` — typecheck without emitting.
- `npm test` — run the test suite with Vitest.

## Tests

```bash
npm test
```

The suite covers creation, validation, redirection, hit counting, stats,
unknown codes, port configuration and code uniqueness.