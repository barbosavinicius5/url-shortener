# URL Shortener — API HTTP

Encurtador de URL implementado pelos agentes Factor OS.

## Stack

- Node.js 20 + TypeScript
- Express (HTTP framework)
- Vitest (testes)
- Armazenamento em memória (Map) — sem banco de dados

## Instalação

```bash
npm ci
```

## Execução

```bash
npm run build
PORT=3000 node dist/server.js
```

A variável `PORT` é opcional (padrão: `3000`).

### Exemplos de uso

```bash
# Criar link curto
curl -X POST http://localhost:3000/shorten \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com/pagina"}'
# Resposta: {"code":"aB3xYz","shortUrl":"http://localhost:3000/aB3xYz"}

# Redirecionar
curl -v http://localhost:3000/aB3xYz
# 302 → https://example.com/pagina

# Estatísticas
curl http://localhost:3000/aB3xYz/stats
# Resposta: {"code":"aB3xYz","url":"https://example.com/pagina","hits":1}
```

## Testes

```bash
npm test
```

## Scripts disponíveis

| Script         | Descrição                    |
|----------------|------------------------------|
| `npm run build` | Compila TypeScript para `dist/` |
| `npm run typecheck` | Valida tipos sem emitir    |
| `npm test`      | Executa a suíte de testes    |

## Endpoints

### `POST /shorten`

Cria um link curto para uma URL.

- **Payload:** `{ "url": "https://..." }`
- **Resposta 201:** `{ "code": "...", "shortUrl": "http://localhost:3000/..." }`
- **Resposta 400:** `{ "error": "mensagem" }` (URL inválida/ausente)

### `GET /:code`

Redireciona o código para a URL original.

- **302** — redirecionamento (incrementa contador)
- **404** — `{ "error": "Link not found." }`

### `GET /:code/stats`

Retorna estatísticas do link.

- **200** — `{ "code": "...", "url": "...", "hits": N }`
- **404** — `{ "error": "Link not found." }`