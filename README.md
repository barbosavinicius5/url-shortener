# URL Shortener

API HTTP mínima para criar URLs curtas, redirecionar acessos e consultar estatísticas. Os dados são mantidos exclusivamente em memória e são perdidos ao reiniciar o processo.

## Pré-requisitos e instalação

- Node.js 20.x

```bash
npm install
```

## Execução

Compile e inicie o servidor (a saída do TypeScript fica em `dist/src`):

```bash
npm run build
node dist/src/server.js
```

A porta padrão é `3000`. Configure outra porta com `PORT`:

```bash
PORT=4000 node dist/src/server.js
```

## API

Criar um link curto:

```bash
curl -X POST http://localhost:3000/shorten \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com/long-page"}'
```

Redirecionar para a URL original:

```bash
curl -i http://localhost:3000/abc123
```

Consultar estatísticas:

```bash
curl http://localhost:3000/abc123/stats
```

## Verificações

```bash
npm run typecheck
npm run build
npm test
```