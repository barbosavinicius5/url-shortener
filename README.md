# URL Shortener

Minimal HTTP API for creating in-memory short URLs, redirecting to originals, and reading hit statistics.

## Requirements and setup

Requires Node.js 20. Install dependencies reproducibly with:

```sh
npm ci
# or: npm install
```

Run the development server with the default port 3000 (or set `PORT` to an integer from 1 to 65535):

```sh
npm start
PORT=4310 npm start
```

Data is stored only in memory and is lost when the process restarts.

## API

Create a short URL:

```sh
curl -X POST http://localhost:3000/shorten \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com/page"}'
```

Redirect (returns HTTP 302):

```sh
curl -i http://localhost:3000/abc123
```

Read statistics:

```sh
curl http://localhost:3000/abc123/stats
```

## Checks

```sh
npm run typecheck
npm run build
npm test
```