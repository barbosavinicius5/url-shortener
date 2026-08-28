# URL Shortener

A minimal HTTP URL shortener built with Node.js 20, TypeScript and Express. Links are stored in memory and are lost when the process restarts.

## Requirements

- Node.js 20.x
- npm

## Install and run

```bash
npm ci
npm run dev
```

The compiled application can be built and started with:

```bash
npm run build
npm start
```

The server listens on `http://localhost:3000` by default. Set `PORT` to use another valid port from 1 to 65535; the returned short URL uses the configured port.

```bash
PORT=4310 npm run dev
```

## API

### Create a short link

```bash
curl -X POST http://localhost:3000/shorten \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com/page"}'
```

A successful request returns `201`:

```json
{
  "code": "abc123",
  "shortUrl": "http://localhost:3000/abc123"
}
```

Only valid `http://` and `https://` URLs are accepted. Invalid input returns `400` with an `error` property.

### Redirect

`GET /:code` redirects to the original URL with status `302` and increments its access count.

```bash
curl -i http://localhost:3000/abc123
```

### Statistics

`GET /:code/stats` returns the code, original URL and successful redirect count without changing the count.

```bash
curl http://localhost:3000/abc123/stats
```

Unknown codes return `404` with an `error` property.

## Tests and checks

```bash
npm run typecheck
npm run build
npm test
```