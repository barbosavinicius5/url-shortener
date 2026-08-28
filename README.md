# URL Shortener

A simple URL shortener service built with Node.js 20, TypeScript, Express, and Vitest.

> **Warning:** All data is stored in memory. Restarting the service will lose all shortened URLs and hit counters.

## Prerequisites

- Node.js 20 or later
- npm

## Installation

```bash
npm install
```

## Running the Service

```bash
npm start
```

The server starts on port 3000 by default. To use a custom port:

```bash
PORT=8080 npm start
```

## API Endpoints

### Create Short URL

```bash
curl -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/very/long/page"}'
```

Response `201`:

```json
{
  "code": "Ab3XyZ",
  "shortUrl": "http://localhost:3000/Ab3XyZ"
}
```

### Redirect to Original URL

```bash
curl -i http://localhost:3000/Ab3XyZ
```

Response `302` with `Location` header pointing to the original URL.

### Get Statistics

```bash
curl http://localhost:3000/Ab3XyZ/stats
```

Response `200`:

```json
{
  "code": "Ab3XyZ",
  "url": "https://example.com/very/long/page",
  "hits": 1
}
```

## Running Tests

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

## Port Configuration

| Environment Variable | Default | Description              |
| -------------------- | ------- | ------------------------ |
| `PORT`               | `3000`  | Server port and short URL base |