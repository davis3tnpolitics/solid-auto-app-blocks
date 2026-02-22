# Examples

This folder stores concrete examples of generated frontend and backend app blocks.

Primary workflow (run from repo root):

```bash
pnpm gen:examples
```

With overrides:

```bash
pnpm gen:examples -- --web demo-web --api demo-api --model User --web-port 3200 --api-port 3201 --force true
```

Directories:

- `examples/frontend-next/` for Next.js generator usage
- `examples/backend-nest/` for Nest generator + CRUD pagination usage

## Frontend Example (Next.js)

Generate (manual):

```bash
pnpm create:next-app -- --name example-web --port 3100
```

Run:

```bash
pnpm --filter example-web dev -- --port 3100
```

## Backend Example (NestJS)

Generate (manual):

```bash
pnpm create:nest-app -- --name example-api --port 3101
```

Run:

```bash
pnpm --filter example-api start:dev
```

## Backend CRUD + Pagination Example

After generating `example-api`, scaffold a model resource using `api-updator` (manual):

```bash
pnpm update:api -- --app example-api --model User
pnpm update:api -- --app example-api --all
```

`--all` reads model names from Prisma schema files in `packages/database/prisma/**/*.prisma`.

This generates:

- CRUD DTOs/controllers/services/modules
- `dto/pagination-query.dto.ts`
- paginated `GET /users` response shape:
  - `metadata`: `pageSize`, `count`, `pageCount`, `pageNumber`
  - `data.items`: array of records
