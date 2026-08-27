# URL Shortener

API HTTP mínima para criar URLs curtas, redirecionar acessos e consultar estatísticas. Os dados ficam somente em memória e são perdidos quando o processo reinicia.

## Instalação e execução

Requer Node.js 20 ou superior.

```bash
npm install
npm run build
npm start
```

A porta padrão é `3000`. Configure outra porta com `PORT` (entre 1 e 65535):

```bash
PORT=4000 npm start
```

## Endpoints

Criar um encurtamento:

```bash
curl -X POST http://localhost:3000/shorten \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com/page"}'
```

Retorna `201` com `code` e `shortUrl`. Somente URLs `http` e `https` são aceitas.

- `GET /:code` responde `302` e redireciona para a URL original, incrementando `hits`.
- `GET /:code/stats` responde `200` com `{ "code", "url", "hits" }`, sem incrementar o contador.
- Códigos inexistentes retornam `404`; entradas inválidas retornam `400` com `{ "error": "..." }`.

## Testes

```bash
npm run typecheck
npm test
```
