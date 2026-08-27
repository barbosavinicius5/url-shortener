# URL Shortener API

A small HTTP API that shortens HTTP(S) URLs in memory. Data is local to the running process and is not persisted.

## Install and run

Requires Node.js 20.

```bash
npm install
npm run build
PORT=4321 npm start
```

`PORT` is optional and defaults to `3000`. The returned short URL always uses `http://localhost:<PORT>`.

## API

Create a short URL:

```bash
curl -X POST http://localhost:3000/shorten \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com/a-page"}'
# {"code":"abc123","shortUrl":"http://localhost:3000/abc123"}
```

Follow a short URL (returns HTTP 302):

```bash
curl -i http://localhost:3000/abc123
```

Read statistics without incrementing `hits`:

```bash
curl http://localhost:3000/abc123/stats
# {"code":"abc123","url":"https://example.com/a-page","hits":1}
```

Invalid URLs return `400`; unknown codes return `404`.

## Tests

```bash
npm run build
npm run typecheck
npm test
```