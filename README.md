# URL Shortener

A minimal HTTP API for shortening URLs. Records are stored only in memory: restarting the process removes all shortened URLs.

## Requirements and installation

Use Node.js 20.x, then install dependencies:

```bash
npm ci
```

## Run

The server listens on port `3000` by default. Set `PORT` to use another valid port (1–65535):

```bash
PORT=4310 npm start
# or during development:
npm run dev
```

## API

Create a short URL:

```bash
curl -X POST http://localhost:3000/shorten \\
  -H 'Content-Type: application/json' \\
  -d '{"url":"https://example.com/page"}'
```

This returns `201` with `{ "code": "abc123", "shortUrl": "http://localhost:3000/abc123" }`.
Only non-empty URLs beginning with `http://` or `https://` are accepted.

Visit `GET /:code` to receive a `302` redirect to the original URL. Each successful redirect increments `hits`.
Use `GET /:code/stats` to retrieve `{ "code", "url", "hits" }` without incrementing the count.
Unknown codes return `404`; invalid creation payloads return `400` with an `error` message.

## Verify

```bash
npm run typecheck
npm run build
npm test
```