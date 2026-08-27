# url-shortener

Encurtador de URLs via API HTTP, implementado em **Node.js 20 + TypeScript + Express** com armazenamento **exclusivamente em memória** (um `Map` volátil) e testes com **Vitest**.

## Pré-requisitos

- **Node.js 20.x** (`>=20 <21`)
- npm

## Instalação

```bash
npm ci
# ou
npm install
```

## Executando o serviço

```bash
npm start            # usa a porta padrão 3000
PORT=4000 npm start  # usa a porta 4000
```

- A porta é lida da variável de ambiente `PORT`.
- Sem `PORT`, o serviço usa a porta padrão **3000**.
- Com `PORT` presente, porém inválida (ex.: `PORT=abc`), o serviço aplica a regra documentada: volta para a porta padrão **3000** (nunca produz `NaN`).

## Endpoints

### `POST /shorten`

Cria um encurtamento a partir de uma URL HTTP(S).

Requisição:

```bash
curl -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/pagina"}'
```

Resposta `201`:

```json
{ "code": "abc123", "shortUrl": "http://localhost:3000/abc123" }
```

- O código tem exatamente **6 caracteres alfanuméricos** e é único entre os códigos ativos.
- A mesma URL enviada duas vezes **pode** gerar códigos diferentes (não há deduplicação).
- Erros (`400`) têm formato `{ "error": "..." }`:
  - campo `url` ausente ou não string;
  - URL que não começa exatamente com `http://` ou `https://`.

### `GET /:code`

Redireciona para a URL original.

```bash
curl -i http://localhost:3000/abc123
```

- Código existente: `302` com header `Location` apontando para a **URL original exata**; cada acesso bem-sucedido incrementa o contador `hits` em 1.
- Código inexistente: `404` com `{ "error": "Short URL not found" }`.

### `GET /:code/stats`

Consulta estatísticas do código.

```bash
curl http://localhost:3000/abc123/stats
```

Resposta `200`:

```json
{ "code": "abc123", "url": "https://example.com/pagina", "hits": 2 }
```

- Consultar estatísticas **não** altera `hits`.
- Código inexistente: `404`.

## Armazenamento

- **Somente em memória** (um `Map` em processo). Não há banco de dados, Redis nem arquivo.
- Reiniciar o processo **perde** todos os encurtamentos e contadores.

## Qualidade

```bash
npm run typecheck   # tsc --noEmit
npm run build       # tsc (gera dist/)
npm test            # vitest run
```

O build de produção gera artefatos apenas em `dist/`; testes não entram no build.

## Estrutura

```text
src/
  app.ts                      # composição do app Express (sem listener)
  server.ts                   # entrada: resolve PORT e abre o listener
  config/port.ts              # resolução de porta (default 3000)
  routes/short-url.routes.ts  # tradução HTTP <-> serviço
  services/short-url.service.ts # regra de negócio (geração, redirect, stats)
  stores/in-memory-short-url.store.ts # Map volátil
  validation/url-validation.ts  # validação HTTP(S) e geração de código
  types.ts                    # contratos internos
tests/
  short-url.api.test.ts
```