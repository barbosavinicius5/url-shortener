# url-shortener

Encurtador de URL - implementado pelos agentes Factor OS

## Descrição

API HTTP mínima para encurtamento de URLs com redirecionamento e estatísticas de acesso. Armazenamento exclusivamente em memória (Map), sem dependências de infraestrutura externa.

## Endpoints

- `POST /shorten` — Cria uma URL curta
- `GET /:code` — Redireciona para a URL original
- `GET /:code/stats` — Retorna estatísticas de acesso

## Instalação

```bash
npm ci
```

## Execução

```bash
# Porta padrão (3000)
npm start

# Porta customizada
PORT=8080 npm start
```

O serviço estará disponível em `http://localhost:<PORT>`.

## Desenvolvimento

### Build

```bash
npm run build
```

Compila o TypeScript para `dist/`.

### Typecheck

```bash
npm run typecheck
```

Verifica tipos sem emitir arquivos.

### Testes

```bash
npm test
```

Executa a suíte de testes com Vitest.

## Exemplos de uso

### Criar URL curta

```bash
curl -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/pagina-muito-longa"}'
```

Resposta (201):
```json
{
  "code": "abc123",
  "shortUrl": "http://localhost:3000/abc123"
}
```

### Redirecionar

```bash
curl -v http://localhost:3000/abc123
```

Resposta (302):
```
Location: https://example.com/pagina-muito-longa
```

### Estatísticas

```bash
curl http://localhost:3000/abc123/stats
```

Resposta (200):
```json
{
  "code": "abc123",
  "url": "https://example.com/pagina-muito-longa",
  "hits": 5
}
```

## Validação

A API aceita apenas URLs que comecem com `http://` ou `https://`. Outros protocolos ou valores inválidos retornam 400 com `{ "error": "..." }`.

## Armazenamento

Os dados são armazenados exclusivamente em memória (Map). Reiniciar o processo apaga todos os códigos e contadores.

## Scripts disponíveis

- `npm run build` — Compilação TypeScript (`tsc`)
- `npm run typecheck` — Verificação de tipos (`tsc --noEmit`)
- `npm test` — Testes automatizados (`vitest run`)
- `npm start` — Inicia o servidor compilado (`node dist/server.js`)

## Tecnologias

- Node.js 20
- TypeScript 5
- Express 4
- Vitest 2 + Supertest 7