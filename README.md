# URL Shortener

API HTTP de encurtamento e redirecionamento de URLs, construída com Node.js 20, TypeScript e Express.

## Instalação

```bash
npm install
```

## Execução

```bash
# Desenvolvimento (com hot-reload via tsx)
npm run dev

# Produção
npm run build
npm start
```

A porta padrão é `3000`. Para usar outra porta, defina a variável de ambiente `PORT`:

```bash
PORT=4173 npm run dev
```

## Endpoints

### Criar encurtamento

```bash
curl -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/pagina"}'
```

Resposta `201`:

```json
{
  "code": "aB3xYz",
  "shortUrl": "http://localhost:3000/aB3xYz"
}
```

### Redirecionar

```bash
curl -v http://localhost:3000/aB3xYz
```

Resposta `302` com `Location` apontando para a URL original.

### Estatísticas

```bash
curl http://localhost:3000/aB3xYz/stats
```

Resposta `200`:

```json
{
  "code": "aB3xYz",
  "url": "https://example.com/pagina",
  "hits": 1
}
```

## Testes

```bash
npm test
```

## Build e Typecheck

```bash
npm run typecheck
npm run build
```

## Estrutura

```
src/
├── app.ts                    # Composição Express, sem listen
├── config.ts                 # Configuração de porta
├── server.ts                 # Entrypoint com listen
├── routes/url-routes.ts      # Handlers HTTP
├── services/url-shortener-service.ts  # Regras de negócio
├── store/
│   ├── url-store.ts          # Interface do armazenamento
│   └── in-memory-url-store.ts  # Implementação em memória
└── types/url.ts              # Tipos e DTOs
```

## Licença

MIT