# URL Shortener

Serviço HTTP de encurtamento de URLs com armazenamento em memória.

## Instalação

```bash
npm ci
```

## Configuração

A porta do serviço é configurável pela variável de ambiente `PORT` (padrão: `3000`).

## Scripts

| Script | Descrição |
|--------|-----------|
| `npm run build` | Compila TypeScript para `dist/` |
| `npm run typecheck` | Verifica tipos sem emitir arquivos |
| `npm test` | Executa os testes com Vitest |
| `npm start` | Inicia o servidor a partir do código compilado |

## Endpoints

### POST /shorten

Encurta uma URL longa.

**Request:**
```json
{ "url": "https://example.com/long-path" }
```

**Response `201`:**
```json
{ "code": "aB3x9Z", "shortUrl": "http://localhost:3000/aB3x9Z" }
```

**Erros `400`:** URL ausente, vazia, não-string, ou que não começa com `http://` ou `https://`.

### GET /:code

Redireciona para a URL original.

**Response:** `302` com header `Location` apontando para a URL original.

**Erros `404`:** Código inexistente.

### GET /:code/stats

Consulta as estatísticas de um código.

**Response `200`:**
```json
{ "code": "aB3x9Z", "url": "https://example.com/long-path", "hits": 3 }
```

**Erros `404`:** Código inexistente.

## Exemplos

```bash
# Criar uma URL curta
curl -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/long-path"}'

# Redirecionar
curl -L http://localhost:3000/aB3x9Z

# Consultar estatísticas
curl http://localhost:3000/aB3x9Z/stats
```

## Estrutura do projeto

```
src/
├── app.ts           # Factory do Express e middleware
├── server.ts        # Ponto de entrada (listen)
├── config.ts        # Resolução de PORT e base URL
├── routes/
│   └── url-routes.ts # Rotas HTTP
├── services/
│   └── url-service.ts # Regras de domínio
└── store/
    └── url-store.ts # Armazenamento em memória (Map)
```

## Limitações

- Os dados são mantidos em memória e são perdidos ao reiniciar o processo.
- Não há persistência, deduplicação, autenticação ou expiração.
- Cada criação gera um código único; a mesma URL pode receber códigos diferentes.