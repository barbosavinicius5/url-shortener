# URL Shortener

A simple HTTP API for shortening URLs, redirecting to original URLs, and viewing access statistics.

## Prerequisites

- Node.js 20.x
- npm

## Installation

```bash
npm install
```

## Running the Server

```bash
npm start
```

The server starts on `http://localhost:3000` by default.

### Configuration

Set the `PORT` environment variable to change the listening port:

```bash
PORT=4000 npm start
```

The `shortUrl` in responses will reflect the configured port.

## API Endpoints

### Create Short URL

```
POST /shorten
Content-Type: application/json

{
  "url": "https://example.com/very/long/path"
}
```

**Response** (201):
```json
{
  "code": "Ab3xYz",
  "shortUrl": "http://localhost:3000/Ab3xYz"
}
```

**Error** (400):
```json
{
  "error": "URL must use http or https protocol"
}
```

### Redirect

```
GET /:code
```

Returns a `302` redirect to the original URL. Increments the hit counter.

### Statistics

```
GET /:code/stats
```

**Response** (200):
```json
{
  "code": "Ab3xYz",
  "url": "https://example.com/very/long/path",
  "hits": 42
}
```

## Testing

```bash
npm test
```

## Build

```bash
npm run build
```

## Type Checking

```bash
npm run typecheck
```

## Development

```bash
npm ci
npm run typecheck
npm run build
npm test
```