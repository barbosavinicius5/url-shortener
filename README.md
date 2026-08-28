# url-shortener

Minimal HTTP URL shortener built with Node.js 20, TypeScript and Express. Records are stored only in memory and are lost when the process restarts. The same URL can be shortened more than once.

## Install and run

```bash
npm ci
npm start
```

The server listens on port `3000` by default. Set `PORT` to a positive port number to change it:

```bash
PORT=4321 npm start
```

## API

Create a short URL:

```bash
curl -X POST http://localhost:3000/shorten \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com/page"}'
```

Redirect (each successful request increments `hits`):

```bash
curl -i http://localhost:3000/ABC123
```

Read statistics without incrementing hits:

```bash
curl http://localhost:3000/ABC123/stats
```

Only `http://` and `https://` URLs are accepted. Unknown codes return `404`.

## Quality checks

```bash
npm run typecheck
npm test
npm run build
```