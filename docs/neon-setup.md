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
npx prisma db push
npx prisma generate
```

The current Prisma config reads `DIRECT_URL` first, then falls back to `DATABASE_URL`.

## Applying schema changes

Production schema changes are applied with `npx prisma db push` before the code
that depends on the new columns is deployed. The shared-link expiry/revoke change
adds nullable `SharedWorkspace.expiresAt`, `SharedWorkspace.revokedAt`, and
`SharedWorkspace.manageTokenHash` columns so legacy rows can keep loading.

## Shared workspace feature

`DATABASE_URL`이 설정되어 있으면 앱의 "팀 공유 링크 만들기" 기능이 활성화됩니다.
스키마를 반영하려면 위의 `prisma db push`를 실행하세요 (SharedWorkspace,
SharedWorkspaceVote, SharedWorkspaceOpinion 테이블이 생성됩니다). DB가 없으면
공유 API는 503을 반환하고 앱은 localStorage 모드로 동작합니다.
