# URL Shortener

A minimal HTTP API for shortening URLs, redirecting visitors to the original
address and tracking how many times each short link was accessed.

Built with Node.js 20, TypeScript, Express and Vitest. All data lives in
memory — restarting the process resets every short link.

## Prerequisites

- Node.js >= 20
- npm

## Installation

```bash
npm install
```

## Running

```bash
npm run build
npm start
```

The server listens on the port defined by the `PORT` environment variable
(default `3000`) and prints `URL shortener listening on http://localhost:<port>`
when it is ready. `PORT` must be an integer between `1` and `65535`; any other
value aborts the bootstrap with a configuration error.

```bash
PORT=8080 npm start
```

The configured port is used as the base of every returned `shortUrl`
(`http://localhost:<port>/<code>`).

### Endpoints

| Method | Path           | Description                                          |
| ------ | -------------- | ---------------------------------------------------- |
| POST   | `/shorten`     | Creates a short code for a URL                       |
| GET    | `/:code`       | Redirects (`302`) to the original URL and counts a hit |
| GET    | `/:code/stats` | Returns `code`, original `url` and `hits`            |

#### Create a short URL

```bash
curl -X POST http://localhost:3000/shorten \
  -H 'Content-Type: application/json' \
  -d '{"url": "https://example.com/page"}'
```

Response — `201 Created`:

```json
{
  "code": "aB3xY9",
  "shortUrl": "http://localhost:3000/aB3xY9"
}
```

Only `http://` and `https://` URLs are accepted (case-sensitive prefix). A
missing body, a missing `url` property, a non-string value, an invalid URL or
a malformed JSON body produces `400` with a non-empty `error` message.

Codes are six alphanumeric characters and are checked against collisions
before being stored; shortening the same URL twice may produce different
codes.

#### Redirect

`GET http://localhost:3000/aB3xY9` answers `302` with a `Location` header
pointing to the original URL. Every successful redirect increments the link's
hit counter. Unknown codes answer `404`.

#### Statistics

`GET http://localhost:3000/aB3xY9/stats` answers `200` with:

```json
{
  "code": "aB3xY9",
  "url": "https://example.com/page",
  "hits": 2
}
```

`hits` reflects only successful `GET /:code` redirects. Reading the statistics
never changes the counter. Unknown codes answer `404`.

## Scripts

| Command              | Description                                    |
| -------------------- | ---------------------------------------------- |
| `npm run build`      | Compiles TypeScript to `dist/`                 |
| `npm run typecheck`  | Type-checks the project without emitting files |
| `npm test`           | Runs the Vitest test suite                     |
| `npm start`          | Starts the compiled server (`dist/server.js`)  |

## Tests

```bash
npm test
```

The suite uses Vitest with Supertest against the `createApp` factory — no real
port is opened and no external network access is required. Store and code
generator are injectable, which makes collision and retry behavior
deterministic.

## Architecture

```text
src/
├── app.ts                    # Express app factory (composition + error handling)
├── server.ts                 # PORT parsing and listener bootstrap
├── types/url.ts              # UrlRecord, UrlStore and DTO contracts
├── store/inMemoryUrlStore.ts # The single Map-backed store
├── services/
│   ├── codeGenerator.ts      # 6-char alphanumeric code generation
│   ├── urlValidator.ts       # http/https validation
│   └── urlService.ts         # Use cases: create, redirect, stats
└── routes/urlRoutes.ts       # Thin HTTP handlers
```

Routes only translate HTTP into service calls; domain rules and mutations live
in the service and store layers. `createApp` never starts a listener, so the
application can be tested without side effects.

## Storage

Short links are kept in an in-memory `Map`. There is no database, Redis or
file persistence: restarting the process clears every record by design.