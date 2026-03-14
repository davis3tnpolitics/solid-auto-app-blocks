# Development Guide

This guide shows how to go from a new repo copy (template/fork/clone) plus a Prisma schema to a working generated web + API stack.

## 1. Create your repo copy

Choose one path:

- Use as a GitHub template, then clone your new repo.
- Fork, then clone your fork.
- Clone directly if you are working in this source repo.

```bash
git clone <your-repo-url>
cd solid-auto-app-blocks
```

## 2. Install dependencies

```bash
pnpm install
```

## 3. Configure environment variables

Create a root `.env` from `.env.example`:

```bash
cp .env.example .env
```

Set at least:

```bash
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB_NAME?sslmode=require
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
AUTH_SECRET=replace-me
AUTH_GITHUB_ID=replace-me
AUTH_GITHUB_SECRET=replace-me
JWT_SECRET=replace-me
CUBE_API_URL=http://localhost:4000
CUBE_API_TOKEN=replace-me
```

## 4. Add or update Prisma models

Prisma is configured as a multi-file schema (`--schema ./prisma`), so put models under `packages/database/prisma/models/*.prisma`.

Example `packages/database/prisma/models/project.prisma`:

```prisma
model Project {
  id        String   @id @default(uuid()) @db.Uuid
  name      String
  status    String   @default("draft")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## 5. Run Prisma migration + generation

From repo root:

```bash
pnpm --filter database db:migrate:dev -- --name init_project
pnpm --filter database db:generate
```

What this gives you:

- Prisma client (`packages/database/client/prisma/*`)
- Generated contracts (`packages/database/contracts/*`)
- Generated docs/stubs based on configured Prisma generators

## 6. Generate apps

Create a Next app and Nest app:

```bash
pnpm create:block -- --block next-app --name web --port 3000 --skip-install
pnpm create:block -- --block nest-app --name api --port 3001 --skip-install
pnpm install
```

## 7. Generate backend CRUD from Prisma contracts

Generate for one model:

```bash
pnpm create:block -- --block api-updator --app api --model Project
```

Or generate all models in `packages/database/prisma/**/*.prisma`:

```bash
pnpm create:block -- --block api-updator --app api --all
```

## 8. Generate analytics contracts/services (optional but recommended)

```bash
pnpm create:block -- --block cube-service-updator --app api --model Project
```

## 9. Generate Next CRUD + analytics pages

```bash
pnpm create:block -- --block next-crud-pages --app web --model Project
pnpm create:block -- --block next-analytics-pages --app web --analytics-app api --model Project
```

## 10. Run the generated stack

Run API:

```bash
pnpm --filter api start:dev
```

In another terminal, run web:

```bash
pnpm --filter web dev -- --port 3000
```

Optional: run a dedicated CubeJS server (`apps/cube`) if you generated one:

```bash
pnpm create:block -- --block cube-app --name cube --port 4000 --skip-install
pnpm install
pnpm --filter cube dev
```

## 11. Smoke test

- API status: `http://localhost:3001/`
- API docs: `http://localhost:3001/docs`
- CRUD route (example): `http://localhost:3001/projects`
- Web app: `http://localhost:3000`
- Generated analytics pages: `http://localhost:3000/analytics`

## 12. One-command workflow alternative

If you want the full starter pipeline in one command:

```bash
pnpm create:workflow -- --workflow examples --web web --api api --model Project --web-port 3000 --api-port 3001
```

This runs ordered block generation for Next app, Nest app, API resource scaffolding, analytics scaffolding, and web page scaffolding.

## 13. Useful maintenance commands

```bash
pnpm create:block -- --list
pnpm create:workflow -- --list
pnpm lint
pnpm typecheck
pnpm test
pnpm verify
```

## Notes

- You do **not** need CubeJS for the basic generated web+api CRUD flow.
- You **do** need a running Cube endpoint when using generated analytics pages (`next-analytics-pages`), since those pages query Cube through the generated Next proxy route (`/api/analytics/cube`).
- Re-run generators safely as your schema evolves; they are designed for iterative scaffolding.
- Use `/* no-auto-update */` (or `/*_ no-auto-update _*/`) in generated files you want generators to leave untouched.
- For quick local generator runs without Prisma regeneration, some generators support `--skip-db-generate`.
