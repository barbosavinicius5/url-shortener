# url-shortener

Encurtador de URL - implementado pelos agentes Factor OS

Serviço HTTP mínimo para encurtar URLs, redirecionar códigos curtos e
acompanhar a quantidade de acessos. Implementado com **Node.js 20**,
**TypeScript**, **Express** e armazenamento **exclusivamente em memória**
(`Map`), sem banco de dados, Redis, arquivos de persistência ou serviços
externos.

## Pré-requisitos

- [Node.js](https://nodejs.org/) **20.x** (verifique com `node --version`).
- npm (distribuído com o Node).

## Instalação

```bash
npm install
```

> Em CI usamos `npm ci`, que exige o `package-lock.json` versionado.

## Scripts

| Script           | Descrição                                                  |
| ---------------- | --------------------------------------------------------- |
| `npm run build`  | Compila o TypeScript para `dist/` (`tsc`).                |
| `npm run typecheck` | Verifica os tipos sem emitir arquivos (`tsc --noEmit`). |
| `npm test`       | Executa os testes com Vitest (`vitest run`).              |
| `npm start`      | Inicia o servidor a partir de `dist/` (`node dist/src/server.js`). |
| `npm run dev`    | Inicia em modo desenvolvimento via `ts-node`.            |

## Execução local

A porta é configurada pela variável de ambiente `PORT` (padrão `3000`):

```bash
PORT=3000 npm start
# URL shortener listening on http://localhost:3000
```

## Endpoints

### `POST /shorten`

Cria um código curto para uma URL. O corpo deve ser JSON com a propriedade `url`.

```bash
curl -s -X POST http://localhost:3000/shorten \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://www.example.com/artigo-longo"}'
```

Resposta `201`:

```json
{ "code": "aZ3x9K", "shortUrl": "http://localhost:3000/aZ3x9K" }
```

A URL de entrada deve começar com `http://` ou `https://`. Caso contrário a
API responde `400` com `{ "error": "..." }`. A mesma URL pode receber códigos
diferentes (não há deduplicação).

### `GET /:code`

Redireciona (`302`) para a URL original e incrementa o contador de acessos
(`hits`) do código. Código inexistente responde `404`.

```bash
curl -s -i http://localhost:3000/aZ3x9K
# HTTP/1.1 302 Found
# Location: https://www.example.com/artigo-longo
```

### `GET /:code/stats`

Retorna estatísticas (`200`) sem alterar a contagem de acessos:

```bash
curl -s http://localhost:3000/aZ3x9K/stats
```

```json
{ "code": "aZ3x9K", "url": "https://www.example.com/artigo-longo", "hits": 1 }
```

Código inexistente responde `404`.

## Contratos

| Situação                    | Status | Corpo                                 |
| --------------------------- | ------ | ------------------------------------- |
| Criação com URL válida      | `201`  | `{ "code": string, "shortUrl": string }` |
| Entrada inválida            | `400`  | `{ "error": string }`                 |
| Stats de código existente   | `200`  | `{ "code", "url", "hits" }`           |
| Código inexistente (ou stats) | `404` | `{ "error": string }`                 |
| Redirecionamento existente  | `302`  | header `Location`                     |

## Testes

```bash
npm test
```

Os testes cobrem: criação + redirecionamento (happy path), formato e ausência
de colisão dos códigos, resposta `400` para entradas inválidas, `404` para
códigos inexistentes, contagem de `hits` no `/stats` e o uso da porta
configurada no `shortUrl`.

## Limitações

- Os dados vivem **apenas em memória** durante a execução e são **perdidos ao
  reiniciar** o serviço (não há persistência).
- Sem autenticação, frontend, deduplicação, expiração, edição, remoção,
  rate limiting ou analytics além de `hits`.

## CI

O workflow `.github/workflows/ci.yml` executa `npm ci`, `npm run typecheck`,
`npm run build` e `npm test` em Node 20 a cada `push`/`pull_request`.