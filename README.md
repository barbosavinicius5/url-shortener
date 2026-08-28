# url-shortener

API HTTP mínima de encurtamento e redirecionamento de URLs.

- **Runtime:** Node.js 20
- **Linguagem:** TypeScript (compilado para CommonJS)
- **HTTP:** Express 4
- **Testes:** Vitest + Supertest
- **Armazenamento:** exclusivamente em memória (`Map`), sem banco de dados, Redis ou arquivos

## Pré-requisitos

- Node.js 20.x (definido em `engines.node` como `>=20 <21`)
- npm (compatível com a versão que acompanha o Node 20)

## Instalação

```bash
npm install
```

As dependências de runtime são apenas `express`. As de desenvolvimento (`typescript`, `vitest`, `supertest`, `@types/*`) são instaladas junto.

## Iniciar o serviço

```bash
npm run build   # compila src/ e tests/ para dist/
node dist/src/server.js
```

Ou, para desenvolvimento, é possível executar diretamente via `ts-node`/`tsx` conforme preferir, mas o fluxo oficial usa o build primeiro.

### Configuração da porta (`PORT`)

A porta é resolvida a partir da variável de ambiente `PORT`:

- Se `PORT` não estiver definida, o serviço usa a porta padrão **3000**.
- Se `PORT` estiver definida, deve ser um inteiro entre **1 e 65535**;
  um valor inválido faz o serviço falhar cedo no boot com erro explícito.

```bash
PORT=8080 node dist/src/server.js
# -> URL shortener listening on http://localhost:8080
```

A base do `shortUrl` retornado por `POST /shorten` reflete a porta efetivamente em uso.

## Endpoints

### `POST /shorten`

Cria um link curto para uma URL válida.

- Corpo (JSON): `{ "url": "https://exemplo.com/pagina" }`
- Regras: `url` é obrigatória e deve começar com `http://` ou `https://`.
- Sucesso (`201`):

```json
{ "code": "abc123", "shortUrl": "http://localhost:3000/abc123" }
```

- URL ausente, não-string ou com protocolo diferente de HTTP(S) → `400`:

```json
{ "error": "url must start with http:// or https://" }
```

O código gerado tem exatamente 6 caracteres alfanuméricos (`[A-Za-z0-9]`),
é único entre os links ativos durante a execução e nunca é deduplicado: a
mesma URL pode gerar códigos diferentes.

### `GET /:code`

Redireciona para a URL original.

- Código existente → `302` com header `Location: <url original>` e incrementa
  `hits` exatamente uma vez.
- Código inexistente → `404`:

```json
{ "error": "Short URL not found" }
```

### `GET /:code/stats`

Retorna estatísticas do código (somente leitura, não incrementa `hits`).

- Código existente (`200`):

```json
{ "code": "abc123", "url": "https://exemplo.com/pagina", "hits": 0 }
```

- Código inexistente → `404`.

## Exemplos de uso (curl)

```bash
# Criar um link curto
curl -s -X POST http://localhost:3000/shorten \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com/artigo-longo"}'

# Redirecionar (seguindo o 302)
curl -sL http://localhost:3000/abc123

# Consultar estatísticas
curl -s http://localhost:3000/abc123/stats
```

## Verificação (build, typecheck e testes)

```bash
npm run typecheck   # tsc --noEmit
npm run build       # tsc
npm test            # vitest run
```

Os três comandos devem terminar com exit code `0`. A suíte de testes cobre a
criação e o redirecionamento (happy path), o retorno `404` para código
inexistente, o retorno `400` para URL inválida e a contagem de `hits` exposta
em `/stats`.

## Estrutura do projeto

```text
src/
  app.ts            # factory Express (sem listen)
  config.ts         # resolução validada de PORT
  server.ts         # entrypoint que chama listen
  types/url.ts      # UrlRecord, DTOs e contratos de resposta
  store/urlStore.ts # Map encapsulado (persistência em memória)
  services/urlService.ts # validação, geração de código e casos de uso
  routes/urlRoutes.ts    # handlers HTTP/endpoints
tests/
  urlApi.test.ts    # testes de integração HTTP (supertest)
  urlService.test.ts# validação e contagem de hits no serviço/store
```

## Fora de escopo

Autenticação, frontend, persistência em disco/banco, deploy, rate limiting,
deduplicação, edição/exclusão/expiração de links e métricas além de `hits`.