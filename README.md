# URL Shortener API

Serviço HTTP mínimo de encurtamento de URLs, construído com Node.js 20, TypeScript e Express.

## Pré-requisitos

- Node.js >= 20 < 21
- npm

## Instalação

```bash
npm install
```

## Build

```bash
npm run build
```

Compila o TypeScript para o diretório `dist/`.

## Typecheck

```bash
npm run typecheck
```

Verifica tipos sem gerar saída.

## Testes

```bash
npm test
```

Roda os testes automatizados com Vitest.

## Execução

```bash
npm start
```

O servidor inicia na porta configurada pela variável de ambiente `PORT` (padrão: `3000`).

```bash
PORT=8080 npm start
```

## API

### Criar encurtamento

```
POST /shorten
Content-Type: application/json

{ "url": "https://exemplo.com/pagina" }
```

Resposta `201`:

```json
{
  "code": "Ab3xYz",
  "shortUrl": "http://localhost:3000/Ab3xYz"
}
```

### Redirecionar

```
GET /:code
```

Resposta `302` redirecionando para a URL original.

### Estatísticas

```
GET /:code/stats
```

Resposta `200`:

```json
{
  "code": "Ab3xYz",
  "url": "https://exemplo.com/pagina",
  "hits": 5
}
```

### Erros

- `400` — body ausente, JSON inválido ou URL inválida:

```json
{ "error": "Invalid or missing 'url' field. Must be a valid http or https URL." }
```

- `404` — código inexistente:

```json
{ "error": "Code not found" }
```

## Exemplos com curl

```bash
# Criar encurtamento
curl -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://exemplo.com/pagina"}'

# Redirecionar (segue redirect)
curl -L http://localhost:3000/Ab3xYz

# Estatísticas
curl http://localhost:3000/Ab3xYz/stats

# Erro: URL inválida
curl -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "ftp://invalido.com"}'

# Erro: código inexistente
curl http://localhost:3000/NAOEXISTE
```