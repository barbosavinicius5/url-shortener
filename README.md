# URL Shortener API

API HTTP mínima para criar códigos curtos, redirecionar para URLs originais e consultar estatísticas. Os registros vivem apenas em memória e são perdidos quando o processo reinicia.

## Requisitos e instalação

É necessário Node.js 20 e npm. Instale as dependências com:

```bash
npm ci
```

## Execução

```bash
npm run build
npm start
```

A porta padrão é `3000`. Para configurar outra porta, use `PORT`:

```bash
PORT=8080 npm start
```

## Endpoints

- `POST /shorten` com `{ "url": "https://example.com/page" }` cria um código e retorna `201` com `code` e `shortUrl`.
- `GET /:code` retorna `302` para a URL original e incrementa `hits`.
- `GET /:code/stats` retorna `200` com `{ code, url, hits }`, sem incrementar acessos.

URLs devem usar `http://` ou `https://`. Entradas inválidas, códigos inexistentes e rotas desconhecidas retornam JSON com `{ "error": "..." }`.

## Testes e gates

```bash
npm run typecheck
npm run build
npm test
```