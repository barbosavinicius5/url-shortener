# URL Shortener API

API HTTP desenvolvida em Node.js 20, TypeScript e Express para encurtamento, redirecionamento e consulta de estatísticas de URLs. O armazenamento é realizado exclusivamente em memória (`Map`), sem dependência de bancos de dados externos.

## Sumário

- [Requisitos](#requisitos)
- [Instalação](#instalação)
- [Configuração de Porta](#configuração-de-porta)
- [Execução](#execução)
- [Endpoints da API](#endpoints-da-api)
  - [1. Encurtar URL](#1-encurtar-url)
  - [2. Redirecionar URL](#2-redirecionar-url)
  - [3. Estatísticas de Acesso](#3-estatísticas-de-acesso)
- [Testes e Qualidade](#testes-e-qualidade)
- [Arquitetura](#arquitetura)

---

## Requisitos

- Node.js `20.x`
- npm `10.x` ou superior

## Instalação

Clone o repositório e instale as dependências com `npm ci` (ou `npm install`):

```bash
npm ci
```

## Configuração de Porta

A porta do servidor pode ser configurada através da variável de ambiente `PORT`:

- Se `PORT` for informada e válida (número inteiro positivo entre 1 e 65535), ela será usada para iniciar o servidor e para compor o `shortUrl` retornado na resposta (`http://localhost:<PORT>/<code>`).
- Caso `PORT` esteja ausente ou seja inválida, a porta padrão adotada é `3000`.

Exemplo:

```bash
export PORT=8080
npm start
```

## Execução

### Modo Desenvolvimento

Executa a aplicação com recarregamento via `tsx`:

```bash
npm run dev
```

### Modo Produção

Compila o código TypeScript para JavaScript e inicia o servidor:

```bash
npm run build
npm start
```

---

## Endpoints da API

### 1. Encurtar URL

Gera um código curto alfanumérico único de 6 caracteres para uma URL fornecida.

- **Método**: `POST`
- **Rota**: `/shorten`
- **Headers**: `Content-Type: application/json`
- **Body**:
  ```json
  {
    "url": "https://example.com/minha-pagina-longa"
  }
  ```

#### Respostas

- **`201 Created`** (Sucesso):
  ```json
  {
    "code": "aB3xYz",
    "shortUrl": "http://localhost:3000/aB3xYz"
  }
  ```

- **`400 Bad Request`** (URL ausente, não-string, formato inválido ou protocolo diferente de `http:`/`https:`):
  ```json
  {
    "error": "URL must be a non-empty string"
  }
  ```

---

### 2. Redirecionar URL

Redireciona para a URL original associada ao código e incrementa em 1 o contador de acessos (`hits`).

- **Método**: `GET`
- **Rota**: `/:code` (exemplo: `GET /aB3xYz`)

#### Respostas

- **`302 Found`**: Redirecionamento com cabeçalho `Location: <url original>`.
- **`404 Not Found`** (Código inexistente):
  ```json
  {
    "error": "Short URL not found"
  }
  ```

---

### 3. Estatísticas de Acesso

Consulta o total de redirecionamentos realizados (`hits`) para o código informado, sem alterar o contador.

- **Método**: `GET`
- **Rota**: `/:code/stats` (exemplo: `GET /aB3xYz/stats`)

#### Respostas

- **`200 OK`**:
  ```json
  {
    "code": "aB3xYz",
    "url": "https://example.com/minha-pagina-longa",
    "hits": 3
  }
  ```

- **`404 Not Found`** (Código inexistente):
  ```json
  {
    "error": "Short URL not found"
  }
  ```

---

## Testes e Qualidade

O projeto conta com uma suíte completa de testes automatizados com Vitest, cobrindo fluxos de sucesso, validações de entrada, comportamento de redirecionamento, contagem de estatísticas e configuração de portas.

### Executar Verificação de Tipos

```bash
npm run typecheck
```

### Executar Compilação

```bash
npm run build
```

### Executar Testes Automatizados

```bash
npm test
```

---

## Arquitetura

A estrutura do projeto separa claramente as responsabilidades:

- `src/config.ts`: Resolução de configuração e validação de `PORT`.
- `src/store/url-store.ts`: Abstração `UrlStore` e implementação em memória `InMemoryUrlStore` (`Map`).
- `src/services/url-service.ts`: Regras de negócio, geração de códigos únicos, validação de URLs e manipulação de registros.
- `src/routes/url-routes.ts`: Definição de rotas Express e tratamento de respostas/códigos HTTP.
- `src/app.ts`: Configuração e fábrica da aplicação Express (middlewares e roteamento).
- `src/server.ts`: Ponto de entrada para execução do servidor HTTP.
- `tests/url-api.test.ts`: Suíte de testes automatizados.