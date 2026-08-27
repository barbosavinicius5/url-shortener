# url-shortener

Serviço HTTP de encurtamento, redirecionamento e estatísticas de URLs.

## Stack

- Node.js 20 + TypeScript 5.x
- Express 5.x
- Vitest 3.x para testes
- Armazenamento exclusivamente em memória

## Requisitos

- Node.js >=20 <21 (ou Docker)

## Instalação

```bash
npm install
```

## Scripts disponíveis

| Script         | Descrição                                    |
|----------------|----------------------------------------------|
| `npm run build`      | Compila TypeScript para `dist/`             |
| `npm run typecheck`  | Verifica tipos sem emitir código            |
| `npm test`           | Executa a suíte de testes (Vitest)          |
| `npm start`          | Inicia o servidor (requer `npm run build`)  |
| `npm run dev`        | Inicia o servidor em modo watch (sem build) |

## Uso

### Iniciar o servidor

Porta padrão (3000):

```bash
npm run build && npm start
```

Porta customizada:

```bash
PORT=4000 npm run build && npm start
```

### Endpoints

#### Criar um encurtamento

```bash
curl -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{"url":"https://exemplo.com/pagina-muito-longa"}'
```

Resposta (HTTP 201):

```json
{
  "code": "abc123",
  "shortUrl": "http://localhost:3000/abc123"
}
```

#### Redirecionar (seguir o código)

```bash
curl -v http://localhost:3000/abc123
# HTTP 302 → redireciona para https://exemplo.com/pagina-muito-longa
```

Use `curl` sem `-L` para ver o redirect sem seguir:

```bash
curl -v http://localhost:3000/abc123 2>&1 | grep -i location
```

#### Consultar estatísticas

```bash
curl http://localhost:3000/abc123/stats
```

Resposta (HTTP 200):

```json
{
  "code": "abc123",
  "url": "https://exemplo.com/pagina-muito-longa",
  "hits": 1
}
```

### Erros esperados

- `400` — URL ausente, inválida ou com protocolo não suportado (apenas `http:` e `https:`)
- `404` — Código curto inexistente

## Testes

```bash
npm test
```

A suíte cobre:

- Criação válida com verificação de código e `shortUrl`
- Rejeição de URLs inválidas (ausente, vazia, mal-formada, protocolo não suportado)
- Redirecionamento com `302` e header `Location`
- Código inexistente retorna `404` (tanto em redirect quanto em stats)
- Incremento de `hits` somente em redirects bem-sucedidos
- Múltiplos acessos incrementam cumulativamente
- Consulta de `/stats` não incrementa `hits`
- Criação da mesma URL gera códigos diferentes
- `/stats` é tratado como rota de estatísticas, não como código

## Observações

- O armazenamento é volátil: todos os dados são perdidos ao reiniciar o servidor.
- Não há autenticação, rate limiting, banco de dados ou serviços externos.
- O código-fonte está organizado em camadas separadas: rotas, serviço e armazenamento.