# URL Shortener

API HTTP minimalista de encurtamento de URLs, construída com **Node.js 20**, **TypeScript** e **Express**. Os registros e a contagem de acessos ficam **exclusivamente em memória** (um `Map`): ao reiniciar o processo, os dados são perdidos.

## Requisitos

- Node.js 20 ou superior
- npm 10 ou superior

## Instalação

```bash
npm install
```

## Executando o serviço

```bash
npm start
```

Por padrão o serviço escuta na porta `3000`. Para usar outra porta, defina a variável de ambiente `PORT`:

```bash
PORT=4100 npm start
```

- `PORT` ausente ou vazia → usa o valor padrão `3000`.
- `PORT` inválida (não inteiro positivo) → o processo falha cedo, com mensagem clara, em vez de iniciar em uma porta inesperada.

## Endpoints

### `POST /shorten`

Cria um código curto para uma URL. Aceita somente URLs com esquema `http://` ou `https://`. O código tem exatamente 6 caracteres alfanuméricos e é único entre os códigos ativos; reenviar a mesma URL pode gerar códigos diferentes (não há deduplicação).

```bash
curl -X POST http://localhost:3000/shorten \
  -H 'Content-Type: application/json' \
  -d '{"url": "https://exemplo.com/pagina"}'
```

Resposta `201`:

```json
{ "code": "abc123", "shortUrl": "http://localhost:3000/abc123" }
```

Entrada ausente, vazia, não string ou inválida (sem esquema HTTP(S)) responde `400` com `{ "error": "..." }`.

### `GET /:code`

Redireciona (`302`) para a URL original e incrementa em 1 o contador de acessos daquele código.

```bash
curl -i http://localhost:3000/abc123
```

Código inexistente responde `404` com JSON de erro.

### `GET /:code/stats`

Retorna o código, a URL original e a quantidade de acessos (via redirecionamento) desde a criação.

```bash
curl http://localhost:3000/abc123/stats
```

Resposta `200`:

```json
{ "code": "abc123", "url": "https://exemplo.com/pagina", "hits": 0 }
```

Código inexistente responde `404`. Consultar estatísticas **não** altera `hits`.

## Testes

```bash
npm test
```

Os testes usam Vitest e Supertest contra a aplicação sem abrir uma porta real; cada caso recebe um store novo, portanto são isolados entre si.

## Verificação de tipos e build

```bash
npm run typecheck
npm run build
```

O build gera o diretório `dist/`, que é o que `npm start` executa (`node dist/server.js`).

## Estrutura

```text
src/
├── app.ts                             # factory do Express (sem listen)
├── server.ts                          # entrypoint: lê PORT e inicia o listener
├── config.ts                          # leitura/validação da porta
├── routes/shortener.ts                # rotas POST /shorten, GET /:code, GET /:code/stats
├── services/url-shortener.service.ts  # validação, geração de código, estatísticas
├── services/url-code.generator.ts     # códigos alfanuméricos de 6 caracteres
├── store/url.store.ts                 # persistência em memória (Map)
└── types/url.ts                       # contratos de domínio
```

## Escopo

Sem autenticação, frontend, banco de dados, Redis, arquivo ou qualquer armazenamento externo — tudo vive em memória durante a execução do processo. Sem expiração, edição, exclusão ou deduplicação de URLs.