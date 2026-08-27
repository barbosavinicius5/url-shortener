# URL Shortener

A minimal HTTP API for URL shortening, built with Node.js 20, TypeScript, and Express. Storage is purely in-memory (a `Map`) — no database, Redis, or filesystem persistence.

## Quick Start

### Prerequisites

- Node.js 20.x (see `.nvmrc`)
- npm (included with Node.js)

### Install

```bash
npm ci
```

### Run

```bash
# Default port 3000
npm start   # or: node --loader ts-node/esm src/server.ts
# With custom port
PORT=4000 npm start
```

For development with auto-reload:

```bash
npx tsx watch src/server.ts
```

### Build & Type Check

```bash
npm run build       # Compile TypeScript to dist/
npm run typecheck   # Verify types without emitting files
```

### Test

```bash
npm test
```

## API Endpoints

### `POST /shorten`

Create a short URL.

**Request body:**

```json
{ "url": "https://example.com/very/long/path" }
```

**Success (201):**

```json
{ "code": "aB3xYz", "shortUrl": "http://localhost:3000/aB3xYz" }
```

**Validation error (400):**

```json
{ "error": "Invalid URL: must start with http:// or https:// and be a valid URL" }
```

### `GET /:code`

Redirect to the original URL.

- **302** — Found, redirects to the stored URL
- **404** — Code not found

```json
{ "error": "Short URL not found" }
```

### `GET /:code/stats`

Get statistics for a short URL.

**Success (200):**

```json
{ "code": "aB3xYz", "url": "https://example.com/very/long/path", "hits": 5 }
```

**Not found (404):**

```json
{ "error": "Short URL not found" }
```

## Examples

```bash
# Create a short URL
curl -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'

# Redirect
curl -v http://localhost:3000/aB3xYz

# Stats
curl http://localhost:3000/aB3xYz/stats
```

## Architecture

```
src/
├── app.ts          # Express factory (createApp)
├── server.ts       # Port parsing and listen
├── types/url.ts    # TypeScript interfaces (UrlRecord, UrlStore, etc.)
├── store/
│   └── in-memory-url.store.ts   # In-memory Map-backed store
├── services/
│   └── url-shortener.service.ts # Business logic (validation, code generation)
└── routes/
    └── url.routes.ts            # HTTP route handlers
tests/
└── url-api.test.ts              # Integration tests with Supertest
```

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT`   | `3000`  | HTTP server port (1–65535) |

## Scope

- **In-memory only** — all data is lost on restart
- **No authentication, no UI, no database, no Redis**
- **No deduplication** — same URL may produce different codes