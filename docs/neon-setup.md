# Neon Setup

PlanMerge uses Neon as a serverless PostgreSQL database.

## Environment Variables

Create `.env.local` with two Neon connection strings:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST-pooler.REGION.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://USER:PASSWORD@HOST.REGION.aws.neon.tech/neondb?sslmode=require"
```

- `DATABASE_URL`: pooled connection string for the Next.js runtime.
- `DIRECT_URL`: direct connection string for Prisma CLI commands.

## Commands

```bash
npx prisma validate
npx prisma migrate dev --name init
npx prisma generate
```

The current Prisma config reads `DIRECT_URL` first, then falls back to `DATABASE_URL`.
