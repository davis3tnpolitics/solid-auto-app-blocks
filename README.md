# solid-auto-app-blocks

A PNPM monorepo template for generating SOLID, repeatable app blocks (Next.js, NestJS, Cube) with an automation-first workflow.

## What this repo is for

- Generate app and feature scaffolding in a consistent, testable shape.
- Centralize shared packages for config, auth, database, and UI.
- Keep architecture predictable for AI-assisted development.
- Support analytics-heavy frontends with shared chart and map-ready components.

## Current workspace

```txt
.
|- apps/
|  `- web/                  # Next.js frontend
|- packages/
|  |- auth/                 # Shared Auth.js helpers
|  |- communications/       # Placeholder for comms adapters/contracts
|  |- config/               # Shared eslint/prettier/tsconfig/env helpers
|  |- database/             # Prisma schema/client/contracts/docs
|  |- dev-ops/              # Placeholder for shared scripts
|  |- nest-helpers/         # Placeholder for shared Nest helpers
|  `- ui/                   # Shared UI components and analytics primitives
|- automations/
|  |- generators/           # Code generators
|  `- manifests/            # Generator manifests
|- deploy/                  # Deployment templates (currently empty)
`- plans/                   # Implementation planning notes
```

## Quickstart

### Prerequisites

- Node.js LTS
- PNPM (repo uses `pnpm@10.28.0`)

### Install

```bash
pnpm install
```

### Environment

Recommended long-term approach is a single root `.env` (with committed `.env.example`) loaded via `packages/config`.

Current repo status:
- `packages/config/src/env.ts` loads root `.env`.
- `packages/database/.env` also exists for Prisma package-local workflows.

Common variables used across this template:

```bash
# Database
DATABASE_URL=postgresql://...

# Next.js
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001

# Auth.js
AUTH_SECRET=...
AUTH_GITHUB_ID=...
AUTH_GITHUB_SECRET=...

# NestJS
JWT_SECRET=...
```

### Run the web app

```bash
pnpm --filter web dev
```

## Automation generators

Generators are implemented in `automations/generators/*` with matching manifests in `automations/manifests/*`.
All commands below are intended to be run from the repo root.

### Root scripts

```bash
pnpm gen:examples
pnpm gen:examples -- --web <next-app-name> --api <nest-app-name> --model <Model> --web-port 3100 --api-port 3101 --force true|false
pnpm create:next-app -- --name <app> [--port <port>] [--sample true|false] [--force]
pnpm create:nest-app -- --name <app> [--port <port>] [--force]
pnpm add:auth -- --app <next-app-name> [--force]
pnpm update:api -- --app <nest-app-name> --model <Model>
pnpm update:api -- --app <nest-app-name> --models User,Account,Session
```

`pnpm gen:examples` runs a full root-level generation flow:
- creates a Next app (default `example-web` on port `3100`)
- creates a Nest app (default `example-api` on port `3101`)
- scaffolds a CRUD resource for one model (default `User`)

### Create a Next.js app

```bash
pnpm create:next-app -- --name admin --port 3002
```

### Create a NestJS app

```bash
pnpm create:nest-app -- --name api --port 3001
```

### Add Auth.js scaffolding to an existing Next app

```bash
pnpm add:auth -- --app web
```

### Generate Nest CRUD resource(s) from Prisma contracts

```bash
pnpm update:api -- --app api --model User
pnpm update:api -- --app api --models User,Account,Session
```

`api-updator` behavior:
- runs `pnpm --filter database db:generate`
- scaffolds CRUD endpoints/service/module wiring
- derives DTO fields from Prisma/contracts
- respects `/*_ no-auto-update _*/` markers when present

## Examples

See `examples/README.md` for concrete frontend/backend generation commands and a paginated CRUD example flow.

## Useful package commands

### Database (`packages/database`)

```bash
pnpm --filter database db:generate
pnpm --filter database db:migrate:dev
pnpm --filter database db:push
pnpm --filter database db:studio
```

### UI package (`packages/ui`)

```bash
pnpm --filter @workspace/ui build
pnpm --filter @workspace/ui lint
pnpm --filter @workspace/ui test
pnpm --filter @workspace/ui typecheck
```

## House patterns

- TypeScript-first with strict contracts between apps/packages.
- Prisma schema is centralized in `packages/database/prisma/schema.prisma`.
- Shared configuration and env loading live in `packages/config`.
- Auth helpers are shared from `packages/auth`.
- Generators are preferred over one-off hand scaffolding.

## Suggested root scripts (next step)

The root `package.json` currently focuses on generation scripts. A typical next step is adding workspace-wide scripts such as:

- `dev`: `turbo run dev --parallel`
- `build`: `turbo run build`
- `lint`: `turbo run lint`
- `typecheck`: `turbo run typecheck`
- `test`: `turbo run test`

## License

Copyright (c) Trenton Davis 2026
