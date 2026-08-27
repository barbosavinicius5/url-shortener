# URL Shortener API

A minimal HTTP API for creating short URLs, redirecting by code, and consulting access statistics.

## Tech Stack

- Node.js 20
- TypeScript
- Express
- Vitest (testing)

## Installation

```bash
npm ci
```

## Running

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

The server runs on port 3000 by default. Configure a different port with the `PORT` environment variable:

```bash
PORT=8080 npm start
```

## API Endpoints

### Create a short URL

```
POST /shorten
Content-Type: application/json

{
  "url": "https://example.com/very/long/path"
}
```

**Response (201):**

```json
{
  "code": "abc123",
  "shortUrl": "http://localhost:3000/abc123"
}
```

### Redirect to original URL

```
GET /:code
```

**Response (302):** Redirects to the original URL.

### Get statistics

```
GET /:code/stats
```

**Response (200):**

```json
{
  "code": "abc123",
  "url": "https://example.com/very/long/path",
  "hits": 5
}
```

## Error Responses

- **400** — Invalid URL (missing, empty, or not starting with `http://` or `https://`):

```json
{
  "error": "Invalid URL. URL must start with http:// or https://"
}
```

- **404** — Code not found:

```json
{
  "error": "Code not found"
}
```

## Testing

```bash
npm test
```

## Type Checking

```bash
npm run typecheck
```

## Build

```bash
npm run build
```

## Notes

- URLs are stored in memory and reset when the server restarts.
- Each short URL gets a unique 6-character alphanumeric code.
- The same URL can produce different short codes.
- Only `GET /:code` increments the hit counter.