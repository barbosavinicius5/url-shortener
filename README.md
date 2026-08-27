# URL Shortener

A minimal HTTP API for URL shortening built with Node.js 20, TypeScript, and Express.

## Stack

- **Runtime:** Node.js 20 (>=20 <21)
- **Framework:** Express 4
- **Language:** TypeScript 5
- **Testing:** Vitest + Supertest
- **Storage:** In-memory `Map` (no database or external service)

## Quick Start

```bash
# Install dependencies
npm ci

# Type-check
npm run typecheck

# Build (compile to dist/)
npm run build

# Run tests
npm test

# Start the server
npm start
```

## Configuration

The server port is configured via the `PORT` environment variable:

```bash
# Default (port 3000)
npm start

# Custom port
PORT=4173 npm start
```

## Endpoints

### Create a short link

```
POST /shorten
Content-Type: application/json

{"url": "https://example.com/very/long/url"}
```

**Success (201):**

```json
{
  "code": "a1b2c3",
  "shortUrl": "http://localhost:3000/a1b2c3"
}
```

**Invalid URL (400):**

```json
{
  "error": "url must be a valid HTTP or HTTPS URL"
}
```

### Redirect to original URL

```
GET /:code
```

- Existing code: **302** redirect to the original URL.
- Missing code: **404** with JSON error.

### View link statistics

```
GET /:code/stats
```

**Success (200):**

```json
{
  "code": "a1b2c3",
  "url": "https://example.com/very/long/url",
  "hits": 5
}
```

- Missing code: **404** with JSON error.
- `hits` reflects the number of successful redirects. Querying stats does not increment the counter.

## Examples

```bash
# Create a short link
curl -s -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}' | jq .

# Redirect
curl -I http://localhost:3000/a1b2c3

# Stats
curl http://localhost:3000/a1b2c3/stats
```

## Limitations

- All data is stored in memory only. Restarting the process loses all links and hit counters.
- No authentication, deduplication, rate limiting, or persistence.
- This is an initial implementation scoped to the HTTP contract.