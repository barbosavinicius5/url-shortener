# URL Shortener

A minimalist HTTP API for shortening URLs and tracking redirect hits. Built with Node.js 20, TypeScript, Express, and in-memory storage.

## Prerequisites

- **Node.js 20.x**
- **npm** (bundled with Node.js)

## Installation

```bash
npm ci
```

## Configuration

The server port is controlled by the `PORT` environment variable. If not set, it defaults to `3000`.

```bash
PORT=8080 npm start
```

## Usage

Start the server:

```bash
npm start
```

Or in development mode with auto-reload:

```bash
npm run dev
```

### API Endpoints

#### `POST /shorten` — Create a short URL

```bash
curl -s -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/very/long/path"}'

# Response 201:
# { "code": "aB3xY9", "shortUrl": "http://localhost:3000/aB3xY9" }
```

#### `GET /:code` — Redirect to original URL

```bash
curl -v http://localhost:3000/aB3xY9

# Response 302 with Location header pointing to the original URL
```

#### `GET /:code/stats` — Get hit statistics

```bash
curl -s http://localhost:3000/aB3xY9/stats

# Response 200:
# { "code": "aB3xY9", "url": "https://example.com/very/long/path", "hits": 3 }
```

### Error Responses

- `400 { "error": "..." }` — Missing or invalid URL (must start with `http://` or `https://`)
- `400 { "error": "Invalid JSON body" }` — Malformed JSON request body
- `404 { "error": "Short URL not found" }` — Unknown short code
- `500 { "error": "Internal server error" }` — Unexpected server errors

## Storage

All data is stored **in memory** (a `Map`). Data is lost when the process restarts. No database, Redis, or file storage is used.

## Quality Gates

```bash
npm run typecheck   # TypeScript static analysis
npm run build       # Compile to dist/
npm test            # Run Vitest test suite
```

All three commands must exit with code `0` for the implementation to be complete.

## License

ISC