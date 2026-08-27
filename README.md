# URL Shortener

Uma API HTTP mínima para encurtamento e redirecionamento de URLs, construída com Node.js, TypeScript e Express.

Armazenamento exclusivamente em memória — os dados são perdidos ao reiniciar o processo.

## Stack

- **Runtime:** Node.js 20.x
- **Linguagem:** TypeScript 5.9.x (strict mode)
- **HTTP:** Express 5.1.x
- **Testes:** Vitest 3.2.x + Supertest 7.1.x

## Como usar

### Pré-requisitos

- Node.js 20.x
- npm

### Instalação

```bash
npm ci
```

### Build

```bash
npm run build
```

Compila o TypeScript de `src/` para `dist/`.

### Typecheck

```bash
npm run typecheck
```

Verifica a tipagem sem emitir arquivos.

### Testes

```bash
npm test
```

Executa a suíte de testes com Vitest.

### Iniciar o servidor

```bash
npm start
```

Por padrão, o servidor escuta na porta **3000**. Para usar outra porta:

```bash
PORT=4000 npm start
```

## Endpoints

### Criar link curto

```http
POST /shorten
Content-Type: application/json

{ "url": "https://exemplo.com/pagina-muito-longa" }
```

Resposta (201):

```json
{
  "code": "aB3xYz",
  "shortUrl": "http://localhost:3000/aB3xYz"
}
```

**Erros:** corpo ausente, `url` ausente ou URL inválida (não começa com `http://` ou `https://`) retornam `400` com `{ "error": "..." }`.

### Redirecionar

```http
GET /aB3xYz
```

Resposta: redirecionamento `302` para a URL original.

Código inexistente retorna `404` com `{ "error": "Not found" }`.

### Estatísticas

```http
GET /aB3xYz/stats
```

Resposta (200):

```json
{
  "code": "aB3xYz",
  "url": "https://exemplo.com/pagina-muito-longa",
  "hits": 5
}
```

Código inexistente retorna `404` com `{ "error": "Not found" }`.

## Exemplos com curl

```bash
# Criar link curto
curl -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'

# Redirecionar (use -L para seguir o redirect)
curl -v http://localhost:3000/aB3xYz

# Consultar estatísticas
curl http://localhost:3000/aB3xYz/stats
```

## Estrutura do projeto

```
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── src/
│   ├── app.ts              # Factory Express e middlewares
│   ├── server.ts           # Entrypoint e listen
│   ├── config.ts           # Leitura da porta
│   ├── types/
│   │   └── link.ts         # Interfaces dos dados
│   ├── store/
│   │   └── link-store.ts   # Armazenamento em memória (Map)
│   ├── services/
│   │   └── url-shortener-service.ts  # Regras de domínio
│   └── routes/
│       └── shorten-routes.ts         # Rotas HTTP
└── tests/
    └── app.test.ts         # Testes automatizados
```

## Observações

- Armazenamento **volátil**: todos os dados são perdidos quando o processo termina.
- A mesma URL pode gerar códigos diferentes em criações distintas (sem deduplicação).
- Os scripts `build`, `typecheck` e `test` são os gates de qualidade do projeto.