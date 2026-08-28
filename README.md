# url-shortener

API HTTP de encurtamento e redirecionamento de URLs, implementada com Node.js 20, TypeScript e Express. O armazenamento é exclusivamente em memória (nenhuma persistência externa).

## Pré-requisitos

- [Node.js](https://nodejs.org/) 20.x (`>=20 <21`)

## Instalação

```bash
npm install
```

## Execução

### Desenvolvimento

```bash
npm run dev
```

### Produção (compilado)

```bash
npm run build
npm start
```

### Porta

A porta padrão é `3000`. Para usar outra porta, defina a variável de ambiente `PORT`:

```bash
PORT=8080 npm start
# ou
PORT=8080 npm run dev
```

## Scripts

| Script              | Descrição                                |
|---------------------|------------------------------------------|
| `npm run build`     | Compila TypeScript para `dist/`           |
| `npm run typecheck` | Verifica tipos sem emitir arquivos        |
| `npm test`          | Executa os testes com Vitest             |
| `npm start`         | Inicia o servidor a partir de `dist/`    |
| `npm run dev`        | Inicia o servidor com tsx (hot reload)    |

## Endpoints

### `POST /shorten`

Cria um encurtamento para uma URL.

**Request:**

```bash
curl -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/page"}'
```

**Response (201):**

```json
{
  "code": "aB3x9Z",
  "shortUrl": "http://localhost:3000/aB3x9Z"
}
```

**Response (400) — URL ausente ou inválida:**

```json
{
  "error": "Invalid or missing \"url\" field. URL must start with \"http://\" or \"https://\"."
}
```

A URL deve ser uma string começando com `http://` ou `https://`. URLs duplicadas podem gerar códigos distintos (sem deduplicação).

### `GET /:code`

Redireciona para a URL original. Incrementa o contador `hits` a cada acesso.

```bash
curl -L http://localhost:3000/aB3x9Z
```

**Response:** `302` com header `Location` apontando para a URL original, ou `404` se o código não existir.

### `GET /:code/stats`

Retorna estatísticas do encurtamento.

```bash
curl http://localhost:3000/aB3x9Z/stats
```

**Response (200):**

```json
{
  "code": "aB3x9Z",
  "url": "https://example.com/page",
  "hits": 3
}
```

`hits` refleta o número de acessos a `GET /:code`. Consultar `/stats` não incrementa o contador.

**Response (404)** se o código não existir.

## Armazenamento

O armazenamento é exclusivamente em memória (`Map`). Ao reiniciar o processo, todos os encurtamentos são perdidos. Não há banco de dados, Redis ou arquivos.

## Testes

```bash
npm test
```

Os testes usam Vitest e Supertest, sem dependência de rede ou arquivos externos.