# URL Shortener

API HTTP mínima para criar links curtos, redirecionar códigos e consultar estatísticas. Os dados são mantidos exclusivamente em memória e são perdidos quando o processo reinicia.

## Instalação e execução

Requer Node.js 20 e npm.

```bash
npm ci
npm run build
npm start
```

A porta padrão é `3000`. Para usar outra porta:

```bash
PORT=4321 npm start
```

`PORT` deve ser um inteiro positivo entre 1 e 65535.

## Endpoints

- `POST /shorten` — recebe `{ "url": "https://example.com/page" }` e retorna `201` com `code` e `shortUrl`.
- `GET /:code` — redireciona com `302` para a URL original e incrementa `hits`.
- `GET /:code/stats` — retorna `{ code, url, hits }` sem incrementar acessos.

Exemplo:

```bash
curl -X POST http://localhost:3000/shorten \\
  -H 'Content-Type: application/json' \\
  -d '{"url":"https://example.com/page"}'
curl -i http://localhost:3000/ABC123
curl http://localhost:3000/ABC123/stats
```

URLs devem começar com `http://` ou `https://`. A mesma URL pode gerar códigos diferentes. Não há persistência, autenticação, expiração, edição ou exclusão.

## Testes

```bash
npm run typecheck
npm run build
npm test
```