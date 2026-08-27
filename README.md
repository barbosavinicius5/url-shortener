# URL Shortener

API HTTP de encurtamento e redirecionamento de URLs, construída com Node.js 20, TypeScript e Express.

## Stack

- **Runtime:** Node.js 20.x
- **Linguagem:** TypeScript 5.x
- **Framework HTTP:** Express 4.21.x
- **Testes:** Vitest 2.x + Supertest 7.x
- **Armazenamento:** Em memória (`Map`), sem banco de dados ou persistência externa

## Instalação

```bash
npm install
# ou, para instalação determinística:
npm ci
```

## Uso

Inicie o servidor:

```bash
npm start
```

O serviço será iniciado em `http://localhost:3000` (ou na porta definida pela variável `PORT`).

### Variáveis de ambiente

| Variável | Padrão | Descrição              |
|----------|--------|------------------------|
| `PORT`   | `3000` | Porta do servidor HTTP |

### Endpoints

#### Criar encurtamento — `POST /shorten`

Requisição:

```bash
curl -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/pagina-longa"}'
```

Resposta (`201`):

```json
{
  "code": "aB3xYz",
  "shortUrl": "http://localhost:3000/aB3xYz"
}
```

#### Redirecionar — `GET /:code`

```bash
curl -L http://localhost:3000/aB3xYz
```

Redireciona (`302`) para a URL original.

#### Estatísticas — `GET /:code/stats`

```bash
curl http://localhost:3000/aB3xYz/stats
```

Resposta (`200`):

```json
{
  "code": "aB3xYz",
  "url": "https://example.com/pagina-longa",
  "hits": 5
}
```

#### Erros

- **400** — URL ausente, vazia ou com esquema diferente de `http://`/`https://`
- **404** — Código curto não encontrado

## Scripts

| Comando                 | Ação                                  |
|-------------------------|---------------------------------------|
| `npm run build`         | Compila TypeScript para `dist/`       |
| `npm run typecheck`     | Verifica tipos sem emitir arquivos    |
| `npm test`              | Executa todos os testes               |
| `npm start`             | Inicia o servidor em produção         |

## Testes

```bash
npm test
```

Os testes cobrem:
- Criação válida com redirecionamento
- Geração de códigos distintos sem colisão
- URLs inválidas (ausente, vazia, esquema incorreto, tipo inválido)
- Código inexistente (`404`)
- Estatísticas com `hits` inicial zero e incremento após redirecionamentos
- Consulta de estatísticas não incrementa `hits`
- Porta configurável (`PORT`) e valor padrão (`3000`)
- JSON malformado retorna `400`

## Estrutura do projeto

```
.
├── package.json
├── tsconfig.json
├── .gitignore
├── README.md
├── src/
│   ├── app.ts                    # Composição da aplicação Express
│   ├── server.ts                 # Bootstrap e listen
│   ├── types/
│   │   └── url.ts                # Contratos da aplicação
│   ├── store/
│   │   └── inMemoryUrlStore.ts   # Armazenamento em memória
│   ├── services/
│   │   └── urlShortenerService.ts # Lógica de domínio
│   └── routes/
│       └── shortenRoutes.ts      # Rotas HTTP
└── tests/
    ├── app.test.ts               # Testes de integração
    └── helpers.ts                # Utilitários de teste
```

## Escopo

- ✅ Criar encurtamento (`POST /shorten`)
- ✅ Redirecionar (`GET /:code`)
- ✅ Estatísticas (`GET /:code/stats`)
- ✅ Validação de URL
- ✅ Armazenamento exclusivamente em memória
- ✅ Porta configurável

Fora de escopo: autenticação, frontend, banco de dados, Redis, deploy, rate limiting, expiração, edição ou exclusão de links.