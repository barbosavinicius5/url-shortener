# url-shortener

Encurtador de URL — API HTTP de encurtamento, redirecionamento e estatísticas de URLs.

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

### Produção (após build)

```bash
npm run build
node dist/server.js
```

### Configuração de porta

A porta padrão é `3000`. Para usar uma porta diferente, defina a variável de ambiente `PORT`:

```bash
PORT=4000 node dist/server.js
# ou
PORT=4000 npm run dev
```

## Endpoints

### `POST /shorten`

Cria um link curto para uma URL.

**Requisição:**

```bash
curl -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://exemplo.com/pagina"}'
```

**Resposta (201):**

```json
{
  "code": "Ab3x9Z",
  "shortUrl": "http://localhost:3000/Ab3x9Z"
}
```

**Erros (400):**

- Body sem o campo `url`: `{ "error": "url is required" }`
- URL que não começa com `http://` ou `https://`: `{ "error": "url must start with http:// or https://" }`

### `GET /:code`

Redireciona para a URL original associada ao código.

```bash
curl -v http://localhost:3000/Ab3x9Z
```

- Código existente: redirecionamento **302** com header `Location` apontando para a URL original.
- Código inexistente: **404** `{ "error": "Short URL not found" }`.

### `GET /:code/stats`

Consulta as estatísticas de um link curto.

```bash
curl http://localhost:3000/Ab3x9Z/stats
```

**Resposta (200):**

```json
{
  "code": "Ab3x9Z",
  "url": "https://exemplo.com/pagina",
  "hits": 0
}
```

- Código inexistente: **404** `{ "error": "Short URL not found" }`.
- Consultar `/stats` não incrementa `hits`; apenas `GET /:code` (redirecionamento) incrementa.

## Armazenamento

Os links são mantidos **exclusivamente em memória** durante a execução do processo. Reiniciar a aplicação apaga todos os links e contadores. Não há banco de dados, Redis ou persistência em arquivo.

## Testes e qualidade

```bash
# Verificação de tipos (sem emissão de arquivos)
npm run typecheck

# Testes automatizados
npm test

# Compilação TypeScript (gera dist/)
npm run build
```

## Estrutura do projeto

```
src/
  app.ts                     # Composição da aplicação Express
  server.ts                  # Boot: app.listen(port)
  config/
    environment.ts           # Leitura de PORT e configuração
  domain/
    url-link.ts              # Tipos de domínio (UrlLink, ShortenResult, LinkStats)
  storage/
    link-store.ts            # Armazenamento em memória (Map)
  services/
    url-shortener-service.ts # Lógica de negócio: geração de código, redirecionamento, stats
  routes/
    shorten-routes.ts        # POST /shorten
    link-routes.ts           # GET /:code/stats, GET /:code
tests/
  api.test.ts                # Testes de integração com supertest
```