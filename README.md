# url-shortener

Encurtador de URL - API HTTP com Node.js, TypeScript e Express.

## Pré-requisitos

- Node.js 20+ e npm

## Instalação

```bash
npm install
# ou, com lockfile:
npm ci
```

## Configuração

A porta do servidor é configurada pela variável de ambiente `PORT`. Quando ausente, usa `3000`.

```bash
# Porta padrão (3000)
npm start

# Porta personalizada
PORT=4000 npm start
```

## Execução

```bash
# Build + start
npm run build && npm start

# Desenvolvimento (build + start em um comando)
npm run dev
```

## Endpoints

### Criar encurtamento

```bash
curl -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{"url":"https://exemplo.com/pagina-muito-longa"}'
```

Resposta (201):

```json
{
  "code": "aB3xYz",
  "shortUrl": "http://localhost:3000/aB3xYz"
}
```

### Redirecionar

```bash
curl -v http://localhost:3000/aB3xYz
```

Responde `302` com `Location` apontando para a URL original.  
Código inexistente retorna `404`.

### Estatísticas

```bash
curl http://localhost:3000/aB3xYz/stats
```

Resposta (200):

```json
{
  "code": "aB3xYz",
  "url": "https://exemplo.com/pagina-muito-longa",
  "hits": 5
}
```

Código inexistente retorna `404`.

### Erros de validação

```bash
curl -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{}'
# 400: { "error": "URL is required" }

curl -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{"url":"ftp://invalida"}'
# 400: { "error": "URL must start with http:// or https://" }
```

## Testes

```bash
npm test          # Executa a suite com Vitest
npm run typecheck # Verificação de tipos TypeScript
npm run build     # Compilação TypeScript
```

## Notas

- Os dados são armazenados exclusivamente em memória e são perdidos quando o processo é encerrado.
- Cada requisição de criação gera um novo código, mesmo para URLs já encurtadas anteriormente.
- A API não possui autenticação, rate limiting ou qualquer mecanismo de segurança.