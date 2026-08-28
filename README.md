# URL Shortener (API HTTP)

Serviço HTTP mínimo, autocontido, para encurtar URLs, redirecionar para a URL
original e expor estatísticas básicas de acessos. O estado é mantido **apenas
em memória** durante a execução do processo (sem banco de dados, Redis ou
arquivo).

## Stack

- Node.js 20
- TypeScript 5
- Express 4
- Vitest 2 (testes)

## Instalação

```bash
npm install
```

> O `package-lock.json` é versionado; em CI usa-se `npm ci` para instalações
> reprodutíveis.

## Scripts

| Script | Comando | Descrição |
| --- | --- | --- |
| `build` | `tsc -p tsconfig.build.json` | Compila `src/` para `dist/` (não compila testes). |
| `typecheck` | `tsc --noEmit` | Valida tipos de `src/` **e** `tests/` sem emitir. |
| `test` | `vitest run` | Executa a suíte de testes. |
| `start` | `node dist/server.js` | Inicia o servidor a partir do `dist/` compilado. |

Para validar tudo localmente antes de abrir um PR:

```bash
npm run build
npm run typecheck
npm test
```

## Execução local

Compile e inicie:

```bash
npm run build
npm start
```

Ou, para desenvolvimento (sem compilar), rode diretamente com `ts-node`/`node`
após o build. O servidor escuta na porta definida por `PORT` (padrão `3000`).

### Configuração da porta (`PORT`)

- Sem `PORT`: escuta na porta `3000`.
- Com `PORT` (inteiro positivo): usa esse valor e o mesmo aparece no `shortUrl`
  retornado por `POST /shorten`.
- Valor inválido (não inteiro ou <= 0): falha cedo com mensagem clara.

```bash
PORT=4321 npm start
# -> http://localhost:4321/<code>
```

## Endpoints

### `POST /shorten`

Recebe um JSON com o campo `url` (HTTP ou HTTPS).

**Requisição**

```bash
curl -s -X POST http://localhost:3000/shorten \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com/pagina-longa"}'
```

**Resposta `201`**

```json
{
  "code": "abc123",
  "shortUrl": "http://localhost:3000/abc123"
}
```

Regras:

- Código: exatamente 6 caracteres alfanuméricos (`A-Za-z0-9`), único no
  processo.
- `shortUrl`: formado a partir de `http://localhost:<PORT>/<code>`.
- Ausência de `url`, valor vazio/branco ou esquema diferente de `http/https`
  retorna `400` com `{ "error": "..." }`.

### `GET /:code`

Redireciona (`302`) para a URL original. Cada acesso bem-sucedido incrementa
`hits` exatamente uma vez.

```bash
curl -s -i http://localhost:3000/abc123
# HTTP/1.1 302 Found
# Location: https://example.com/pagina-longa
```

Código inexistente: `404` com `{ "error": "Short URL not found" }`.

### `GET /:code/stats`

Retorna estatísticas do código (**não** incrementa `hits`).

**Resposta `200`**

```json
{
  "code": "abc123",
  "url": "https://example.com/pagina-longa",
  "hits": 2
}
```

Código inexistente: `404`.

> Ordem das rotas: `/:code/stats` é registrada antes de `/:code`, então
> `/abc123/stats` nunca é interpretado como um código de redirecionamento.

## Testes

```bash
npm test
```

Cobrem: criação (HTTPS/HTTP e porta configurada), ausência de colisão de
código, URLs inválidas (`400`), redirecionamento `302` com `Location`,
contagem de `hits` em `/stats`, ausência de código (`404`) e precedência de
`/stats` sobre a rota de redirecionamento.

## CI

`.github/workflows/ci.yml` roda em `push`/`pull_request` no Node 20 com
`npm ci` seguido de `npm run build`, `npm run typecheck` e `npm test`.

## Fora de escopo

Autenticação, frontend, persistência externa, deploy, rate limiting,
deduplicação, edição/exclusão/expiração de URLs e analytics além da contagem
total de redirecionamentos.