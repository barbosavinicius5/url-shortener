# url-shortener

API HTTP de encurtamento de URLs, redirecionamento e estatísticas, com armazenamento exclusivamente em memória.

## Requisitos

- Node.js 20+
- npm

## Executar localmente

```bash
npm ci
npm run dev
```

O servidor escuta em `http://localhost:3000` por padrão. Defina `PORT` para uma porta positiva diferente:

```bash
PORT=8080 npm run dev
```

Para executar a versão compilada:

```bash
npm run build
node dist/src/server.js
```

## API

- `POST /shorten` com `{ "url": "https://example.com" }` cria um link e retorna `code` e `shortUrl`.
- `GET /:code` redireciona para a URL original e incrementa `hits`.
- `GET /:code/stats` retorna `code`, `url` e `hits` sem incrementar o contador.

Os dados são perdidos quando o processo termina. Não há autenticação, deduplicação, persistência ou rate limiting.

## Verificações

```bash
npm run typecheck
npm run build
npm test
```