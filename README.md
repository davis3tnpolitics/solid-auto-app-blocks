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
- Node.js `>=20.9.0` (required for Next.js 16 lint/build commands)
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
pnpm create:block -- --list
pnpm create:block -- --block <manifest-name> [manifest options...]
pnpm create:workflow -- --list
pnpm create:workflow -- --workflow <workflow-name> [workflow variables...]
pnpm create:block -- --block github-workflow-app --app <app-name> --framework next|nest|app
pnpm gen:examples
pnpm dev
pnpm build
pnpm lint
pnpm lint:workspace
pnpm lint:automation-contracts
pnpm verify
pnpm test:automations
pnpm test:ui
pnpm typecheck
pnpm test:automations:update
pnpm gen:examples -- --web <next-app-name> --api <nest-app-name> --model <Model> --web-port 3100 --api-port 3101 --force true|false --skip-db-generate true|false --skip-install true|false
pnpm create:next-app -- --name <app> [--port <port>] [--sample true|false] [--force]
pnpm create:nest-app -- --name <app> [--port <port>] [--force]
pnpm add:auth -- --app <next-app-name> [--force]
pnpm update:api -- --app <nest-app-name> --model <Model>
pnpm update:api -- --app <nest-app-name> --models User,Account,Session
pnpm update:api -- --app <nest-app-name> --all
```

`pnpm gen:examples` runs a full root-level generation flow:

- creates a Next app (default `example-web` on port `3100`)
- creates a Nest app (default `example-api` on port `3101`)
- scaffolds a CRUD resource for one model (default `User`)

`pnpm create:block` is the manifest-driven entrypoint. It resolves the block from `automations/manifests/*.json` and runs its configured generator.

`pnpm create:workflow` is the workflow-driven entrypoint. It resolves a sequence from `automations/workflows/*.json`, then runs the required blocks in dependency order with shared variables.

`next-app` and `nest-app` now generate app CI workflows by default in `.github/workflows/app-<name>-ci.yml`.
Use `--skip-ci-workflow` to opt out.

### Create a Next.js app

```bash
pnpm create:block -- --block next-app --name admin --port 3002
pnpm create:block -- --block next-app --name admin --port 3002 --skip-install
pnpm create:block -- --block next-app --name admin --skip-ci-workflow
```

### Create a NestJS app

```bash
pnpm create:block -- --block nest-app --name api --port 3001
pnpm create:block -- --block nest-app --name api --port 3001 --skip-install
pnpm create:block -- --block nest-app --name api --skip-ci-workflow
```

### Run a workflow

```bash
pnpm create:workflow -- --workflow examples
pnpm create:workflow -- --workflow examples --web admin-web --api admin-api --model User
pnpm create:workflow -- --workflow examples --dry-run
```

### Generate app CI workflow for existing app

```bash
pnpm create:block -- --block github-workflow-app --app web --framework next
pnpm create:block -- --block github-workflow-app --app api --framework nest
```

### Add Auth.js scaffolding to an existing Next app

```bash
pnpm create:block -- --block add-auth --app web
```

### Generate Nest CRUD resource(s) from Prisma contracts

```bash
pnpm create:block -- --block api-updator --app api --model User
pnpm create:block -- --block api-updator --app api --models User,Account,Session
pnpm create:block -- --block api-updator --app api --all
pnpm create:block -- --block api-updator --app api --all --search false
pnpm create:block -- --block api-updator --app api --all --skip-db-generate
```

`api-updator` behavior:

- runs `pnpm --filter database db:generate`
- scaffolds CRUD endpoints/service/module wiring
- derives DTO fields from Prisma/contracts
- generates `POST /search` DTO/service/controller wiring by default (`--search false` to skip)
- `--all` discovers model names from Prisma schema files (`packages/database/prisma/**/*.prisma`)
- `--skip-db-generate` is available for quick local smoke tests if Prisma generators are not configured yet
- respects `/*_ no-auto-update _*/` markers when present

`next-app` and `nest-app` run `pnpm install` automatically after generation.
Use `--skip-install` when chaining multiple generators and installing once at the end.

## CI model

- `.github/workflows/automations-tests.yml` is the repo-infrastructure CI pipeline for:
  - automation contract governance
  - workspace lint
  - workspace typecheck
  - automations tests
  - UI tests + coverage artifact
- generated app workflows (`.github/workflows/app-<name>-ci.yml`) run app-scoped lint/typecheck/test/build checks.

## Generator testing

Generator tests live in `automations/tests` and are run with:

```bash
pnpm test:automations
```

Test coverage includes:

- unit logic in generator helpers (naming/search type/guard behavior)
- snapshot contracts for high-signal generated files
- CLI smoke tests through `pnpm create:block`
- manifest schema/entry validation

Snapshot updates:

```bash
pnpm test:automations:update
```

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
pnpm --filter @workspace/ui test:coverage
pnpm --filter @workspace/ui typecheck
```

## House patterns

- TypeScript-first with strict contracts between apps/packages.
- Prisma schema is centralized in `packages/database/prisma/schema.prisma`.
- Shared configuration and env loading live in `packages/config`.
- Auth helpers are shared from `packages/auth`.
- Generators are preferred over one-off hand scaffolding.

## Root validation flow

Use `pnpm verify` to run the standard local quality gate:

1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm test`

`pnpm lint` runs `lint:workspace` plus `lint:automation-contracts`.

## License

Copyright (c) Trenton Davis 2026 MIT
