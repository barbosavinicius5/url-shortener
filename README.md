# url-shortener

Encurtador de URL — serviço HTTP mínimo para criar links curtos, redirecionar aos destinos originais e consultar estatísticas de acesso. Implementado pelos agentes Factor OS.

## Stack

- Node.js 20
- TypeScript
- Express
- Armazenamento em memória (`Map`) — os dados existem apenas enquanto o processo estiver em execução
- Testes com Vitest + Supertest

## Instalação

Requer Node.js 20.

```bash
npm ci
# ou
npm install
```

## Execução

```bash
npm run build
npm start
```

Ou em modo de desenvolvimento:

```bash
npm run dev
```

### Porta

A porta é lida da variável de ambiente `PORT`. Quando não definida, o serviço usa a porta padrão `3000`.

```bash
PORT=4000 npm start
```

## API

### `POST /shorten`

Cria um link curto a partir de uma URL HTTP(S).

Requisição:

```bash
curl -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://exemplo.com/pagina"}'
```

Resposta `201`:

```json
{ "code": "a1B2c3", "shortUrl": "http://localhost:3000/a1B2c3" }
```

- O código é alfanumérico, com exatamente seis caracteres.
- A mesma URL pode gerar códigos diferentes em requisições distintas.
- Entrada ausente, vazia ou com esquema diferente de `http://`/`https://` responde `400` com `{ "error": "..." }`.

### `GET /:code`

Redireciona (`302`) para a URL original. Cada acesso bem-sucedido incrementa o contador `hits` do link. Código inexistente responde `404`.

```bash
curl -i http://localhost:3000/a1B2c3
```

### `GET /:code/stats`

Retorna estatísticas do link. Consultar stats não altera `hits`.

```bash
curl http://localhost:3000/a1B2c3/stats
```

Resposta `200`:

```json
{ "code": "a1B2c3", "url": "https://exemplo.com/pagina", "hits": 2 }
```

Código inexistente responde `404`.

## Testes e verificação

```bash
npm test             # roda a suíte com Vitest
npm run typecheck    # verificação de tipos (tsc --noEmit)
npm run build        # compila para dist/ (tsc)
```

## Notas

- Os dados (links e contadores) são mantidos apenas em memória: reiniciar o serviço perde todos os registros.
- Fora de escopo: autenticação, frontend, persistência externa, deduplicação, expiração, edição/exclusão de links e rate limiting.