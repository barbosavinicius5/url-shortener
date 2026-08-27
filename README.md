# url-shortener

Encurtador de URL — API HTTP mínima implementada em Node.js + TypeScript + Express.

## Pré-requisitos

- Node.js 20.x (versão >=20 e <21)

## Instalação

```bash
npm ci
```

ou

```bash
npm install
```

## Execução

Iniciar o servidor (porta padrão 3000):

```bash
npm run build
npm start
```

Para configurar a porta:

```bash
PORT=4000 npm start
```

Para desenvolvimento com hot-reload:

```bash
npm run dev
```

## Scripts disponíveis

| Comando              | Descrição                             |
|----------------------|---------------------------------------|
| `npm run build`      | Compila TypeScript para `dist/`       |
| `npm run typecheck`  | Verificação de tipos sem emitir       |
| `npm test`           | Executa testes com Vitest             |
| `npm start`          | Inicia o servidor compilado           |
| `npm run dev`        | Inicia o servidor em modo dev (tsx)   |

## Endpoints

### Criar link curto

```
POST /shorten
Content-Type: application/json

{ "url": "https://exemplo.com/pagina" }
```

- `201` — sucesso: `{ "code": "abc123", "shortUrl": "http://localhost:3000/abc123" }`
- `400` — URL ausente, inválida ou protocolo não permitido: `{ "error": "..." }`

### Redirecionar

```
GET /:code
```

- `302` — redireciona para a URL original (header `Location`)
- `404` — código não encontrado: `{ "error": "Code not found" }`

### Estatísticas

```
GET /:code/stats
```

- `200` — sucesso: `{ "code": "abc123", "url": "https://exemplo.com/pagina", "hits": 5 }`
- `404` — código não encontrado: `{ "error": "Code not found" }`

## Exemplos com curl

```bash
# Criar link curto
curl -i -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.example.com/long-url"}'

# Redirecionar (não seguir o redirect)
curl -i -L http://localhost:3000/abc123

# Estatísticas
curl -i http://localhost:3000/abc123/stats
```

## Limitações

- **Armazenamento em memória**: links e contagens são perdidos ao reiniciar o processo.
- **Sem autenticação**: qualquer um pode criar e acessar links.
- **Sem persistência**: não há banco de dados, Redis ou arquivo.
- **Sem rate limiting**: sem proteção contra abuso.
- **MVP**: apenas funcionalidades básicas de encurtamento, redirecionamento e estatísticas.

## Licença

MIT