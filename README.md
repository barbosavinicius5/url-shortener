# URL Shortener

A simple HTTP API for URL shortening and redirection, built with Node.js 20, TypeScript, and Express.

All data is stored in memory and does not persist across restarts.

## Installation

```bash
npm install
```

## Running

```bash
npm run build
npm start
```

The server will start on port `3000` by default. Set the `PORT` environment variable to use a different port:

```bash
PORT=8080 npm start
```

## API Endpoints

### POST /shorten

Shorten a URL.

```bash
curl -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/very-long-path"}'
```

**Response (201):**
```json
{
  "code": "Ab3Xy9",
  "shortUrl": "http://localhost:3000/Ab3Xy9"
}
```

**Validation errors (400):**
```json
{ "error": "URL must start with \"http://\" or \"https://\"" }
```

### GET /:code

Redirect to the original URL.

```bash
curl -v http://localhost:3000/Ab3Xy9
```

Returns `302 Found` with a `Location` header pointing to the original URL.

**Not found (404):**
```json
{ "error": "Not found" }
```

### GET /:code/stats

Get hit count statistics for a shortened URL.

```bash
curl http://localhost:3000/Ab3Xy9/stats
```

**Response (200):**
```json
{
  "code": "Ab3Xy9",
  "url": "https://example.com/very-long-path",
  "hits": 5
}
```

**Not found (404):**
```json
{ "error": "Not found" }
```

## Testing

```bash
npm test
```

This runs the Vitest test suite covering creation, redirection, validation, stats, and isolation.

## Scripts

| Script      | Description                        |
|-------------|------------------------------------|
| `npm run build`     | Compile TypeScript to `dist/` |
| `npm run typecheck` | Type-check without emitting       |
| `npm test`          | Run tests with Vitest              |
| `npm start`         | Start the production server        |
| `npm run test:watch`| Run tests in watch mode            |

## Tech Stack

- **Node.js 20** + **TypeScript 5.8**
- **Express 5.1** for HTTP routing
- **Vitest 3.2** + **Supertest 7** for testing
- In-memory storage (`Map`), no external database