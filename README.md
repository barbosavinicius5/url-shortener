# url-shortener

API HTTP para encurtamento de URLs com redirecionamento e estatísticas de acesso.

Construída em **Node.js 20**, **TypeScript** e **Express**, com armazenamento **exclusivamente em memória** (um `Map`): os dados existem apenas durante o processo e são perdidos ao reiniciar. Não há banco de dados, Redis, arquivos ou qualquer serviço externo.

## Endpoints

| Método | Rota             | Descrição                                    |
| ------ | ---------------- | -------------------------------------------- |
| `POST` | `/shorten`       | Cria um código curto para uma URL            |
| `GET`  | `/:code`         | Redireciona (302) para a URL original        |
| `GET`  | `/:code/stats`   | Retorna estatísticas de acesso do código     |

### `POST /shorten`

Recebe JSON `{"url": "https://exemplo.com/pagina"}`. Aceita apenas strings não vazias que comecem com `http://` ou `https://`.

- Sucesso: `201` com:

```json
{
  "code": "abc123",
  "shortUrl": "http://localhost:3000/abc123",
  "hits": 0
}
```

O `code` tem exatamente 6 caracteres alfanuméricos (`[A-Za-z0-9]`) e é único entre os registros ativos. A mesma URL pode ser encurtada mais de uma vez (sem deduplicação), gerando códigos distintos.

- URL ausente ou inválida: `400` com `{"error": "..."}`.
- JSON malformado no corpo: `400` com `{"error": "..."}`.

### `GET /:code`

- Código existente: `302` com o header `Location` apontando para a URL original. Cada redirecionamento bem-sucedido incrementa `hits` em 1.
- Código inexistente: `404` com `{"error": "..."}` e sem redirecionamento.

### `GET /:code/stats`

- Código existente: `200` com `{"code": "...", "url": "...", "hits": N}`. Consultar estatísticas **não** altera `hits`.
- Código inexistente: `404` com `{"error": "..."}`.

## Requisitos

- Node.js `>=20 <21`
- npm 10

## Instalação

```bash
npm ci          # instala as dependências exatamente como no lockfile (recomendado)
# ou
npm install
```

## Execução

Compile e inicie o servidor:

```bash
npm run build
npm start        # executa node dist/server.js
```

A porta é configurada pela variável de ambiente `PORT` (padrão `3000`):

```bash
PORT=4000 npm start
```

A `shortUrl` retornada pela API usa sempre a porta efetiva do processo: `http://localhost:<PORT>/<code>`.

## Exemplos com curl

Com o servidor rodando na porta 3000:

```bash
# Encurtar uma URL
curl -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/pagina"}'
# -> {"code":"aB3xY9","shortUrl":"http://localhost:3000/aB3xY9","hits":0}

# Acessar o código curto (responde 302; -i mostra o header Location)
curl -i http://localhost:3000/aB3xY9

# Consultar estatísticas
curl http://localhost:3000/aB3xY9/stats
# -> {"code":"aB3xY9","url":"https://example.com/pagina","hits":1}
```

## Desenvolvimento e verificação

Os três gates executam sem dependências externas:

```bash
npm run typecheck   # verificação de tipos (tsc --noEmit) — src + tests
npm run build       # compilação (tsc -p tsconfig.build.json) — emite dist/
npm test            # testes automatizados (vitest run), modo não interativo
```

Os testes (Vitest + Supertest) exercem o contrato HTTP através de `createApp` sem abrir porta TCP e reinicializam o estado (store novo) entre casos.

## Arquitetura

```
src/
  app.ts                            # factory createApp(store, config), middlewares e handlers de erro
  config.ts                         # getConfig(env): PORT e porta efetiva (padrão 3000)
  server.ts                         # bootstrap: único ponto que chama app.listen
  types.ts                          # contratos compartilhados (UrlRecord, UrlStore, AppConfig, respostas)
  routes/
    url.routes.ts                   # tradução HTTP: POST /shorten, GET /:code/stats, GET /:code
  services/
    url-shortener.service.ts        # regras: validação de URL, código único, hits, shortUrl
  store/
    in-memory-url-store.ts          # Map<string, UrlRecord> em memória (process-local)
  utils/
    code-generator.ts               # geração de código alfanumérico de 6 caracteres
tests/
  url-shortener.http.test.ts        # testes de contrato HTTP + colisão determinística
```

Fluxo unidirecional: `rota HTTP -> UrlShortenerService -> UrlStore`. As rotas não contêm regras de negócio; o serviço recebe `UrlStore`, `AppConfig` e o gerador de códigos por injeção, o que permite testes isolados (por exemplo, o teste de colisão de código).

## Decisões de implementação

- **Armazenamento em memória**: `Map<string, UrlRecord>` process-local; reiniciar o processo perde os dados (por design, fora de escopo persistência externa).
- **Sem deduplicação**: cada chamada válida cria um novo registro com `hits: 0`.
- **`hits`** incrementa apenas em redirecionamentos bem-sucedidos de `GET /:code`; a rota de estatísticas apenas lê.
- **Colisões de código**: o serviço gera e verifica em loop antes de salvar, nunca sobrescreve um código ativo.
- **Erros**: sempre JSON no formato `{"error": "..."}`, sem vazamento de stack trace.