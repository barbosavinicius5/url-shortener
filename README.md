# URL Shortener

Serviço HTTP de encurtamento de URLs com armazenamento em memória.

## Stack

- Node.js 20 + TypeScript
- Express
- Vitest (testes)

## Instalação

```bash
npm ci
# ou
npm install
```

## Execução

```bash
# Porta padrão 3000
npm start

# Porta customizada
PORT=4000 npm start
```

## Endpoints

### Criar encurtamento

```bash
curl -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/uma-pagina-muito-longa"}'
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
curl -L http://localhost:3000/aB3xYz
```

Redireciona (302) para a URL original. Cada acesso bem-sucedido incrementa `hits`.

### Estatísticas

```bash
curl http://localhost:3000/aB3xYz/stats
```

Resposta (200):
```json
{
  "code": "aB3xYz",
  "url": "https://example.com/uma-pagina-muito-longa",
  "hits": 0
}
```

### Erros

- URL inválida (ausente, malformada ou esquema diferente de http/https): `400` com `{ "error": "Invalid URL" }`
- Código inexistente: `404` com `{ "error": "Not found" }`

## Testes

```bash
npm test
```

## Comportamento

- Porta configurável via variável `PORT` (padrão: 3000).
- Códigos têm 6 caracteres alfanuméricos e são únicos entre registros ativos.
- A mesma URL pode gerar códigos diferentes em chamadas distintas.
- Armazenamento exclusivamente em memória — os dados são perdidos ao reiniciar o processo.