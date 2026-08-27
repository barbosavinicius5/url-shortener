# URL Shortener API

Minimal HTTP URL shortener using Node.js 20, TypeScript, Express and in-memory storage. Links are lost when the process restarts.

## Requirements and setup

Requires Node.js 20.x. Install dependencies with:

```sh
npm ci
```

Start the compiled server:

```sh
npm run build
PORT=4321 npm start
```

`PORT` defaults to `3000` and must be an integer from 1 to 65535.

## API

Create a short URL:

```sh
curl -X POST http://localhost:3000/shorten \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com/a-page"}'
```

Returns `201` with `code` and `shortUrl`.

Redirect and count an access:

```sh
curl -i http://localhost:3000/ABC123
```

A successful response is `302` with a `Location` header. Query stats without counting an access:

```sh
curl http://localhost:3000/ABC123/stats
```

Invalid URLs return `400`; unknown codes return `404`. The API accepts only `http` and `https` URLs.

## Development checks

```sh
npm run typecheck
npm run build
npm test
```