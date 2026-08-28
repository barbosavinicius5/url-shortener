# URL Shortener API

A lightweight, in-memory HTTP API service for shortening, redirecting, and querying statistics for URLs, built with Node.js 20, TypeScript, and Express.

## Features

- **Shorten URL (`POST /shorten`)**: Generates a unique 6-character alphanumeric code for a valid `http://` or `https://` URL.
- **Redirect (`GET /:code`)**: Performs a `302 Found` HTTP redirection to the original URL and tracks successful hits.
- **Statistics (`GET /:code/stats`)**: Returns hit metrics and original URL without incrementing the hit counter.
- **In-Memory Storage**: URLs and analytics are stored in memory using an encapsulated `Map`. Data is volatile and resets when the process restarts.
- **Configurable Port**: Configurable via `PORT` environment variable (defaults to `3000`).

## Prerequisites

- **Node.js**: `20.x` (Engine: `>=20 <21`)
- **npm**: `10.x` or higher

## Installation

Clone the repository and install the dependencies:

```bash
npm ci
```

*(Alternatively, `npm install`)*

## Available Scripts

- **`npm run typecheck`**: Runs TypeScript type checking (`tsc --noEmit`).
- **`npm run build`**: Compiles the TypeScript project to JavaScript in the `dist/` directory (`tsc`).
- **`npm test`**: Runs the automated test suite using Vitest (`vitest run`).
- **`npm start`**: Starts the compiled server (`node dist/server.js`).

## Running the Server

1. Build the application:
   ```bash
   npm run build
   ```

2. Start the server (default port `3000`):
   ```bash
   npm start
   ```

3. (Optional) Run with a custom port:
   ```bash
   PORT=4567 npm start
   ```

## API Reference & Examples

### 1. Create a Short URL

- **Endpoint**: `POST /shorten`
- **Content-Type**: `application/json`
- **Request Body**:
  ```json
  {
    "url": "https://example.com/very/long/path"
  }
  ```

#### Example cURL

```bash
curl -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/very/long/path"}'
```

#### Success Response (`201 Created`)

```json
{
  "code": "aB3d9Z",
  "shortUrl": "http://localhost:3000/aB3d9Z"
}
```

#### Error Response (`400 Bad Request`)

When the URL is missing, invalid, or does not use `http://` / `https://`:

```json
{
  "error": "URL protocol must be http or https"
}
```

---

### 2. Redirect to Original URL

- **Endpoint**: `GET /:code`

#### Example cURL

```bash
curl -i http://localhost:3000/aB3d9Z
```

#### Success Response (`302 Found`)

Redirects to the destination with the `Location` header and increments the hit counter:

```http
HTTP/1.1 302 Found
Location: https://example.com/very/long/path
```

#### Error Response (`404 Not Found`)

If the code does not exist:

```json
{
  "error": "Short URL not found"
}
```

---

### 3. Get URL Statistics

- **Endpoint**: `GET /:code/stats`

#### Example cURL

```bash
curl http://localhost:3000/aB3d9Z/stats
```

#### Success Response (`200 OK`)

```json
{
  "code": "aB3d9Z",
  "url": "https://example.com/very/long/path",
  "hits": 1
}
```

#### Error Response (`404 Not Found`)

```json
{
  "error": "Short URL not found"
}
```

---

## Storage & Persistence Notice

All data is stored in-memory using an internal `Map`. No external database, Redis instance, or file system storage is used. All shortened URLs and hit counts will be reset upon server restart.