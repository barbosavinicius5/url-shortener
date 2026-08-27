# URL Shortener

API HTTP mínima para criar URLs curtas, redirecionar para a URL original e consultar estatísticas. O armazenamento é exclusivamente em memória: reiniciar o processo elimina todas as URLs e seus contadores.

## Requisitos e execução

Requer Node.js 20.x.

```bash
npm ci
npm run build
npm start
```

A porta padrão é `3000`; configure outra com `PORT` (entre 1 e 65535):

```bash
PORT=4545 npm start
```

## API

- `POST /shorten` com `{ "url": "https://example.com/page" }` retorna `201` com `{ "code": "abc123", "shortUrl": "http://localhost:3000/abc123" }`.
- `GET /:code` retorna `302` para a URL original e incrementa `hits`.
- `GET /:code/stats` retorna `200` com `{ "code", "url", "hits" }`, sem incrementar acessos.

Somente URLs `http` e `https` são aceitas. Erros retornam JSON com `error`; códigos inexistentes retornam `404`.

## Validação

```bash
npm run build
npm run typecheck
npm test
```
