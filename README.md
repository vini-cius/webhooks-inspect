# Webhooks Inspect

Aplicação monorepo para inspecionar e testar webhooks, composta por uma API em Fastify e uma interface web em React.

- API REST com Fastify, Zod e Drizzle ORM
- Banco PostgreSQL orquestrado via Docker Compose
- Documentação automática no Swagger (`/docs`)
- Front-end em React + Vite

## Pré-requisitos

- Node.js 20 ou superior
- pnpm `10.19.0`
- Docker e Docker Compose (para o PostgreSQL)

## Instalação

1. Instale as dependências compartilhadas:

   ```bash
   pnpm install
   ```

2. Configure as variáveis de ambiente da API (`api/.env`). Exemplo:

   ```env
   PORT=3333
   NODE_ENV=development
   DATABASE_URL=postgresql://docker:docker@localhost:5432/webhooks
   ```

## Banco de dados

No diretório `api/`, suba o PostgreSQL local e execute as migrações:

```bash
docker compose up -d
pnpm --filter api db:migrate
```

## Executando em desenvolvimento

API (Fastify):

```bash
pnpm --filter api dev
```

Interface web (React):

```bash
pnpm --filter web dev
```

- API: <http://localhost:3333>
- Documentação Swagger: <http://localhost:3333/docs>
- Front-end: <http://localhost:5173>

## Scripts úteis

- `pnpm --filter api db:generate` — atualiza artefatos do Drizzle a partir do schema
- `pnpm --filter api db:studio` — abre o Drizzle Studio para inspeção do banco
- `pnpm --filter api format` — formata o código da API com Biome
- `pnpm --filter web build` — gera o bundle de produção do front-end
