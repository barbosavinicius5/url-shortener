# url-shortener

Serviço HTTP mínimo de encurtamento de URLs, construído com **Node.js 20**, **TypeScript** e **Express**, com armazenamento exclusivamente **em memória** (um `Map`) e testes com **Vitest**.

## Endpoints

| Método | Rota              | Descrição |
| ------ | ----------------- | --------- |
| `POST` | `/shorten`        | Cria um encurtamento para a URL informada. |
| `GET`  | `/:code`          | Redireciona (`302`) para a URL original e contabiliza o acesso. |
| `GET`  | `/:code/stats`    | Retorna `code`, `url` e `hits` (consultas não incrementam `hits`). |

### POST /shorten

Requisição:

```bash
curl -X POST http://localhost:3000/shorten \
  -H 'Content-Type: application/json' \
  -d '{"url": "https://example.com/pagina"}'
```

Resposta (`201`):

```json
{
  "code": "Ab3xZ9",
  "shortUrl": "http://localhost:3000/Ab3xZ9"
}
```

- O `code` tem exatamente 6 caracteres alfanuméricos e é único durante a execução do processo.
- URLs não são deduplicadas: a mesma URL pode gerar códigos diferentes.
- Entrada inválida (sem `url`, não-string, vazia, protocolo diferente de `http://`/`https://` ou malformada) responde `400` com `{ "error": "..." }`.

### GET /:code

- Código existente: responde `302` com header `Location` apontando para a URL original e incrementa `hits` uma vez.
- Código inexistente: responde `404` com `{ "error": "Short URL not found" }`.

### GET /:code/stats

- Código existente: responde `200` com:

```json
{
  "code": "Ab3xZ9",
  "url": "https://example.com/pagina",
  "hits": 2
}
```

- Código inexistente: responde `404`.

## Instalação

Requisitos: Node.js 20+.

```bash
npm ci
```

## Execução

```bash
npm run build
npm start
```

Para desenvolvimento (recarrega a cada mudança):

```bash
npm run dev
```

## Configuração de porta

A porta de escuta é lida da variável de ambiente `PORT` (padrão `3000`). O `shortUrl` retornado pelo `POST /shorten` usa a porta efetivamente configurada.

```bash
PORT=4545 npm start
```

Valores de `PORT` inválidos (não inteiros ou fora de 1–65535) fazem o processo falhar na inicialização, com erro claro.

## Testes

```bash
npm test
```

Os testes cobrem criação e redirecionamento, código inexistente, URL ausente/inválida, JSON malformado e a contagem de `hits` no endpoint de estatísticas.

## Verificação de tipos e build

```bash
npm run typecheck   # tsc --noEmit
npm run build       # tsc (saída em dist/)
```

## Persistência

Não há persistência: os registros vivem somente na memória do processo. Reiniciar o serviço perde todos os encurtamentos criados.