# URL Shortener

API HTTP mínima para criar URLs curtas, redirecionar para o destino original e consultar acessos. O armazenamento é exclusivamente em memória: todos os registros são perdidos quando o processo reinicia.

## Instalação e execução

Requer Node.js 20 ou superior.

```bash
npm install
npm run build
npm start
```

A porta padrão é `3000`. Para configurar outra porta, use `PORT`:

```bash
PORT=4000 npm start
```

A URL original é preservada exatamente como recebida (após validar o prefixo HTTP/HTTPS).

## API

Criar um encurtamento:

```bash
curl -X POST http://localhost:3000/shorten \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com/page"}'
# 201: {"code":"aB12xY","shortUrl":"http://localhost:3000/aB12xY"}
```

Redirecionar (`302`) para a URL original:

```bash
curl -i http://localhost:3000/aB12xY
```

Consultar estatísticas:

```bash
curl http://localhost:3000/aB12xY/stats
# 200: {"code":"aB12xY","url":"https://example.com/page","hits":0}
```

URLs ausentes, vazias ou que não começam com `http://`/`https://` retornam `400` com `{ "error": "..." }`. Códigos desconhecidos retornam `404` com `{ "error": "Short URL not found" }`.

## Verificação

```bash
npm ci
npm run build
npm run typecheck
npm test
```