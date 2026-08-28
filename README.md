# url-shortener

Encurtador de URL — API HTTP mínima implementada com Node.js 20, TypeScript e Express, com armazenamento exclusivamente em memória.

## Pré-requisitos

- Node.js 20 (`>=20 <21`)

## Instalação

```bash
npm install
# ou, em ambientes de CI / build reproduzível:
npm ci
```

## Execução

Compile o projeto e inicie o serviço:

```bash
npm run build
npm start
```

O serviço escuta em `0.0.0.0` na porta configurada por `PORT` (padrão `3000`). Para usar outra porta:

```bash
PORT=4000 npm start
```

O `shortUrl` retornado pela API sempre reflete a porta efetivamente configurada.

> Os links são mantidos apenas em memória: **todo link curto desaparece ao reiniciar o processo**. Não há banco de dados, Redis ou arquivos.

## Endpoints

### `POST /shorten`

Cria um link curto para uma URL válida (`http://` ou `https://`).

```bash
curl -X POST http://localhost:3000/shorten \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://exemplo.com/pagina"}'
```

Resposta `201`:

```json
{ "code": "abc123", "shortUrl": "http://localhost:3000/abc123" }
```

URL ausente, vazia, inválida ou com esquema diferente de `http`/`https` retorna `400`:

```json
{ "error": "..." }
```

### `GET /:code`

Redireciona (`302`) para a URL original e incrementa o contador de acessos.

```bash
curl -i http://localhost:3000/abc123
```

Código inexistente retorna `404`:

```json
{ "error": "Short URL not found" }
```

### `GET /:code/stats`

Consulta o código, a URL original e a contagem de acessos (somente leitura).

```bash
curl http://localhost:3000/abc123/stats
```

Resposta `200`:

```json
{ "code": "abc123", "url": "https://exemplo.com/pagina", "hits": 3 }
```

Código inexistente retorna `404`.

## Validação

```bash
npm run typecheck   # verificação de tipos (tsc --noEmit)
npm run build       # compila src/ para dist/
npm test            # executa a suíte de testes (vitest run)
```

Os gates de CI executam, nesta ordem: `npm ci`, `npm run typecheck`, `npm run build` e `npm test`.