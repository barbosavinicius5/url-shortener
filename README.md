# URL Shortener

Uma API HTTP mínima para criar links curtos, redirecionar para URLs originais e consultar estatísticas de acesso. Os dados ficam exclusivamente em memória e são perdidos quando o processo é reiniciado.

## Pré-requisitos

- Node.js 20
- npm

## Instalação e execução

```bash
npm install
npm run build
npm start
```

O servidor usa a porta `3000` por padrão. Para escolher outra porta, use a variável `PORT`:

```bash
PORT=8080 npm start
```

Para desenvolvimento com recarga automática:

```bash
npm run dev
```

## API

A URL enviada precisa começar com `http://` ou `https://`. O endpoint de redirecionamento responde com `302`. O armazenamento é efêmero, não há deduplicação, e consultar estatísticas não incrementa `hits`.

### Criar um link

```bash
curl -i -X POST http://localhost:3000/shorten \\
  -H 'Content-Type: application/json' \\
  -d '{"url":"https://example.com/path"}'
```

Resposta `201`:

```json
{"code":"aB12xZ","shortUrl":"http://localhost:3000/aB12xZ"}
```

### Redirecionar

```bash
curl -i http://localhost:3000/aB12xZ
```

Esse acesso responde `302` e incrementa o contador do link.

### Consultar estatísticas

```bash
curl -i http://localhost:3000/aB12xZ/stats
```

A resposta contém `code`, `url` e `hits`; esse endpoint não altera o contador.

## Testes

```bash
npm test
```

Os testes usam Supertest sem abrir uma porta TCP real.