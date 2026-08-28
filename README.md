# url-shortener

Encurtador de URL — API HTTP mínima implementada com Node.js 20, TypeScript e Express.

## Funcionalidades

- `POST /shorten` — cria um código curto para uma URL HTTP(S).
- `GET /:code` — redireciona (HTTP `302`) para a URL original e incrementa `hits`.
- `GET /:code/stats` — consulta `code`, `url` e `hits` de um link.

O armazenamento é exclusivamente em memória (um `Map`): os links são perdidos quando o processo é reiniciado.

## Requisitos

- Node.js 20.x
- npm

## Instalação

```bash
npm ci
```

## Executando

```bash
npm run build
npm start
```

Por padrão o serviço escuta em `http://localhost:3000`. Para usar outra porta, defina a variável de ambiente `PORT`:

```bash
PORT=8080 npm start
```

## Exemplos de uso

### Criar um link curto

```bash
curl -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{"url":"https://exemplo.com/pagina"}'
```

Resposta (`201`):

```json
{ "code": "aB3xYz", "shortUrl": "http://localhost:3000/aB3xYz" }
```

### Redirecionar

```bash
curl -i http://localhost:3000/aB3xYz
```

Resposta (`302`) com cabeçalho `Location` apontando para a URL original.

### Consultar estatísticas

```bash
curl http://localhost:3000/aB3xYz/stats
```

Resposta (`200`):

```json
{ "code": "aB3xYz", "url": "https://exemplo.com/pagina", "hits": 2 }
```

## Qualidade

```bash
npm run typecheck   # tsc --noEmit
npm run build       # tsc -> dist/
npm test            # vitest run
```

## Endpoints

| Método | Rota           | Descrição                                         |
| ------ | -------------- | ------------------------------------------------- |
| POST   | `/shorten`     | Cria um código curto para uma URL HTTP(S) válida  |
| GET    | `/:code`       | Redireciona para a URL original (incrementa hits) |
| GET    | `/:code/stats` | Consulta `code`, `url` e `hits`                   |