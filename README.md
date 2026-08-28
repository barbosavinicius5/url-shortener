# url-shortener

HTTP API service for URL shortening, built with Node.js 20, TypeScript, Express, and in-memory storage.

## Install

```bash
npm ci
```

## Usage

Start the server:

```bash
npm start
```

By default the service listens on port `3000`. Set the `PORT` environment variable to change it:

```bash
PORT=4567 npm start
```

## Endpoints

### Create a short URL

```http
POST /shorten
Content-Type: application/json

{ "url": "https://example.com/very-long-url" }
```

**Success (201):**

```json
{ "code": "aB3xYz", "shortUrl": "http://localhost:3000/aB3xYz" }
```

**Missing or invalid URL (400):**

```json
{ "error": "url must be a valid HTTP or HTTPS URL" }
```

### Redirect to original URL

```http
GET /:code
```

- **302** – redirects to the original URL.
- **404** – `{ "error": "short URL not found" }` if the code does not exist.

### Get URL stats

```http
GET /:code/stats
```

**Success (200):**

```json
{ "code": "aB3xYz", "url": "https://example.com/very-long-url", "hits": 5 }
```

**Not found (404):**

```json
{ "error": "short URL not found" }
```

## Commands

| Command               | Description                        |
|-----------------------|------------------------------------|
| `npm run build`       | Compile TypeScript to `dist/`      |
| `npm run typecheck`   | Run TypeScript type checking       |
| `npm test`            | Run all tests with Vitest          |
| `npm start`           | Start the HTTP server              |

## Requirements

- Node.js 20 (or later)
- No database required – data lives only while the process runs.