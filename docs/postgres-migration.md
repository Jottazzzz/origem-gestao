# Migração para PostgreSQL

Este projeto foi criado primeiro com Cloudflare D1 para funcionar no Sites. O módulo de contratos já usa SQL e Drizzle ORM, então a migração para PostgreSQL é direta, mas depende da hospedagem escolhida.

## Quando usar PostgreSQL

Use PostgreSQL se o projeto for rodar em uma hospedagem Node.js tradicional, como Render, Railway, Vercel, Fly.io, Supabase ou Neon. Para continuar usando o link atual do Sites, mantenha o D1.

## O que já está preparado

- `db/schema.postgres.ts`: schema Drizzle equivalente ao schema atual de contratos.
- `drizzle.postgres.config.ts`: configuração do Drizzle para PostgreSQL.
- `drizzle-postgres/0001_contracts_postgres.sql`: migration SQL inicial.
- `.env.example`: variável `DATABASE_URL`.

## Criar o banco

Crie um banco PostgreSQL em um provedor como Supabase, Neon, Railway ou Render e copie a connection string.

No ambiente de produção, configure:

```bash
DATABASE_URL="postgresql://usuario:senha@host:5432/origem_gestao?sslmode=require"
```

Não coloque valores reais no repositório.

## Aplicar a migration

Com `DATABASE_URL` configurada, rode:

```bash
npm run db:pg:migrate
```

Se preferir aplicar manualmente pelo painel do banco, use o arquivo:

```text
drizzle-postgres/0001_contracts_postgres.sql
```

## Ajuste necessário na aplicação

O deploy atual usa `db/index.ts` com Cloudflare D1. Para rodar fora do Sites, troque a conexão de banco para PostgreSQL usando um driver compatível com a hospedagem escolhida.

Sugestão para hospedagem Node.js:

```ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.postgres";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL não configurada.");
  }

  return drizzle(pool, { schema });
}
```

Depois instale o driver:

```bash
npm install pg
npm install -D @types/pg
```

## Diferenças importantes

- D1/SQLite armazena datas como `text`; PostgreSQL usa `timestamp`.
- D1 não tem enum nativo; PostgreSQL tem os enums `party_type` e `contract_status`.
- PostgreSQL permite índice único parcial, então a migration impede dois contratos ativos com o mesmo CPF/CNPJ diretamente no banco.
- O site atual em Cloudflare Workers não deve usar conexão TCP comum com PostgreSQL. Para manter Workers, prefira D1 ou um banco PostgreSQL com driver HTTP/serverless compatível.

## Próximo passo recomendado

Para uma migração completa, escolha a hospedagem primeiro. A partir disso, substitua `db/index.ts`, instale o driver correto e teste as rotas `/api/contracts` contra o banco PostgreSQL real.
