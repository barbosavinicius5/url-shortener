# URL Shortener

API HTTP mínima para encurtamento, redirecionamento e estatísticas de URLs.

## Pré-requisitos

- Node.js 20 ou superior

## Instalação

```bash
npm install
```

## Execução

```bash
npm run dev
```

O serviço inicia em `http://localhost:3000` por padrão.

### Configuração

Defina a variável de ambiente `PORT` para usar uma porta diferente:

```bash
PORT=4100 npm run dev
```

## Endpoints

### Criar link curto

```bash
curl -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

Resposta `201`:

```json
{
  "code": "Ab3xYz",
  "shortUrl": "http://localhost:3000/Ab3xYz"
}
```

### Redirecionar

```bash
curl -v http://localhost:3000/Ab3xYz
```

Resposta `302` com `Location: https://example.com`.

### Consultar estatísticas

```bash
curl http://localhost:3000/Ab3xYz/stats
```

Resposta `200`:

```json
{
  "code": "Ab3xYz",
  "url": "https://example.com",
  "hits": 1
}
```

## Validação

- URL ausente ou inválida retorna `400` com `{ "error": "..." }`.
- Código inexistente retorna `404`.

## Testes

```bash
npm test
```

## Build e verificação de tipos

```bash
npm run build
npm run typecheck
```