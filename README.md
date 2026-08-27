# url-shortener

Encurtador de URL — API HTTP **em memória** implementada em Node.js 20, TypeScript e Express.

O serviço cria códigos curtos para URLs HTTP(S), redireciona para a URL original e contabiliza os acessos. Todo o armazenamento acontece em memória (um `Map`): não há banco de dados, Redis, persistência em arquivo, autenticação ou frontend. **Reiniciar o processo perde todos os registros.**

## Endpoints

| Método | Rota           | Descrição |
| ------ | -------------- | --------- |
| POST   | `/shorten`     | Cria um encurtamento e responde `201` com `{ code, shortUrl }` |
| GET    | `/:code`       | Redireciona com `302` para a URL original (incrementa `hits`) |
| GET    | `/:code/stats` | Responde `200` com `{ code, url, hits }` (não altera a contagem) |

## Requisitos

- Node.js 20

## Instalação

```bash
npm install
```

## Execução

```bash
npm run build
npm start
```

Por padrão o servidor escuta na porta `3000`. A porta é configurável pela variável de ambiente `PORT`:

```bash
PORT=4000 npm start
```

Regras de resolução da porta:

- `PORT` ausente → usa `3000`;
- `PORT` com um inteiro entre 1 e 65535 → usa o valor informado;
- qualquer outro valor (vazio, não numérico, zero ou fora da faixa) → volta deterministicamente para `3000`.

O `shortUrl` devolvido por `POST /shorten` sempre reflete a porta em uso, no formato `http://localhost:<PORT>/<code>`.

## Testes

```bash
npm test
```

Também estão disponíveis `npm run typecheck` (verificação de tipos com `tsc --noEmit`) e `npm run build` (compilação de `src/` para `dist/`).

## Exemplos (curl)

Criar um encurtamento:

```bash
curl -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/pagina/longa"}'
```

Resposta `201`:

```json
{ "code": "aB3xY9", "shortUrl": "http://localhost:3000/aB3xY9" }
```

Redirecionar (retorna `302` com `Location` apontando para a URL original):

```bash
curl -i http://localhost:3000/aB3xY9
```

Estatísticas (retorna `200` e não altera a contagem):

```bash
curl http://localhost:3000/aB3xY9/stats
```

```json
{ "code": "aB3xY9", "url": "https://example.com/pagina/longa", "hits": 1 }
```

## Contrato de erros

- `400` com `{ "error": "..." }` quando `url` está ausente, não é uma string ou não começa com `http://` ou `https://`.
- `404` com `{ "error": "Shortening not found" }` para códigos inexistentes em `GET /:code` e `GET /:code/stats`.

## Notas de comportamento

- Cada código tem exatamente 6 caracteres alfanuméricos, gerados com `node:crypto`, com verificação de colisão antes de salvar.
- A mesma URL enviada duas vezes gera registros independentes (não há deduplicação).
- Cada redirecionamento bem-sucedido incrementa `hits` exatamente uma vez; requisições com código inexistente (404) e consultas a `/stats` não incrementam.
- Os dados são voláteis e vivem apenas durante a execução do processo.