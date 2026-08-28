# URL Shortener API

A small HTTP API for creating in-memory short URLs, redirecting to their original destinations, and viewing redirect statistics.

## Requirements

- Node.js 20+
- npm

## Install and run

```bash
npm ci
npm run dev
```

The server listens on port `3000` by default. Set `PORT` to configure another supported numeric port:

```bash
PORT=4000 npm run dev
```

The application stores records only in memory. All short URLs and hit counters are lost when the process restarts. There is no authentication, external persistence, URL deduplication, or functionality beyond the three endpoints below.

## API

Create a short URL:

```bash
curl -X POST http://localhost:3000/shorten \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com/a-page"}'
```

The response is `201` and contains a six-character alphanumeric `code` and its `shortUrl`.

Redirect to the original URL:

```bash
curl -i http://localhost:3000/<code>
```

This returns `302` with a `Location` header. Each successful redirect increments the code's `hits` counter.

View statistics:

```bash
curl http://localhost:3000/<code>/stats
```

The response contains `code`, the original `url`, and `hits`. A URL must start with `http://` or `https://`; invalid create requests return `400`. Unknown codes return `404`.

## Development commands

```bash
npm run build      # compile production JavaScript to dist/
npm run typecheck  # check types without emitting files
npm test           # run the Vitest suite
```

The production entrypoint after building is `dist/server.js`.