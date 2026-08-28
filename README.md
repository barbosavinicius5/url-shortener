# url-shortener

A minimal URL shortener API built with **Node.js 20**, **TypeScript**, and **Express**. All data is stored in memory — no database, Redis, or files are used.

## Features

| Endpoint | Method | Description |
| --- | --- | --- |
| `/shorten` | POST | Create a short URL from a long URL |
| `/:code` | GET | Redirect to the original URL (302) |
| `/:code/stats` | GET | View stats for a short URL |

## Requirements

- Node.js 20

## Installation

```bash
npm install
```

Or, using the lockfile:

```bash
npm ci
```

## Running

Build first, then start:

```bash
npm run build
npm start
```

The server listens on port **3000** by default. Override with the `PORT` environment variable:

```bash
PORT=8080 npm start
```

## API Endpoints

### POST /shorten

Create a short URL.

```bash
curl -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/page"}'
```

**Response (201):**

```json
{ "code": "aB3x9Z", "shortUrl": "http://localhost:3000/aB3x9Z" }
```

**Error (400)** — URL missing, not `http://`/`https://`, or malformed:

```json
{ "error": "URL is required" }
```

### GET /:code

Redirect to the original URL.

```bash
curl -I http://localhost:3000/aB3x9Z
```

**Response:** `302` with `Location` header pointing to the original URL.

**Error (404)** — code not found:

```json
{ "error": "Short URL not found" }
```

### GET /:code/stats

Get statistics for a short URL.

```bash
curl http://localhost:3000/aB3x9Z/stats
```

**Response (200):**

```json
{ "code": "aB3x9Z", "url": "https://example.com/page", "hits": 5 }
```

**Error (404)** — code not found:

```json
{ "error": "Short URL not found" }
```

## Data Storage

URLs and their statistics are stored **in memory only**. All data is lost when the server restarts. No database, Redis, or filesystem persistence is used. Each `POST /shorten` call creates a new independent record — the same URL submitted twice will produce different codes.

## Testing

```bash
npm test
```

## Build & Typecheck

```bash
npm run build
npm run typecheck
```