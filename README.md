# URL Shortener API

A minimal URL shortener HTTP API built with Node.js 20, TypeScript, Express, and in-memory storage.

## Prerequisites

- Node.js 20 or higher

## Installation

```bash
npm install
```

Or with a clean install:

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

The server starts on port **3000** by default. Set the `PORT` environment variable to change it:

```bash
PORT=8080 npm start
```

## API

### Create a short URL

```
POST /shorten
Content-Type: application/json

{ "url": "https://example.com/long/path" }
```

**Response (201 Created):**

```json
{
  "code": "aB3xY9",
  "shortUrl": "http://localhost:3000/aB3xY9"
}
```

**Error (400 Bad Request):**

```json
{
  "error": "URL is required"
}
```

### Redirect to original URL

```
GET /:code
```

Returns a **302 Found** redirect to the original URL. Each successful redirect increments the hit counter.

If the code does not exist, returns **404 Not Found**:

```json
{
  "error": "Short URL not found"
}
```

### Get statistics

```
GET /:code/stats
```

**Response (200 OK):**

```json
{
  "code": "aB3xY9",
  "url": "https://example.com/long/path",
  "hits": 5
}
```

If the code does not exist, returns **404 Not Found**.

## Validation

The `POST /shorten` endpoint validates:

- `url` must be present
- `url` must be a non-empty string
- `url` must be a valid URL
- Protocol must be `http:` or `https:`

Invalid requests return **400** with `{ "error": "..." }`.

## Testing

```bash
npm test
```

## Type Checking

```bash
npm run typecheck
```

## Building

```bash
npm run build
```

The compiled output is placed in the `dist/` directory.

## Data Storage

⚠️ **In-memory only.** All data is lost when the server restarts. There is no database, file storage, or persistence layer.

## License

MIT