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
|  |- cube-helpers/         # Shared Cube semantic-layer helpers/contracts
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

## Database scripting note

Use `db-ops` as the home for database-related scripting, including:

- data migrations
- data-engineering scripts/jobs
- seeding/backfill helpers

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

# Cube (used by generated Next analytics proxy route /api/analytics/cube)
CUBE_API_URL=http://localhost:4000
CUBE_API_TOKEN=...
```

### Run the web app

```bash
pnpm --filter web dev
```

### Fake data for fast UI testing

Use the schema-driven fake seeder to quickly populate data for generated screens.

```bash
# regenerate client/contracts/docs/fake-data factories
pnpm --filter database db:generate

# preview records only (no DB writes)
pnpm seed:fake -- --dry-run true --count 5

# seed specific models
pnpm seed:fake -- --models User,Account --count 25

# truncate selected models then reseed
pnpm seed:fake -- --models User,Account,Session,Authenticator --count 50 --truncate true
```

`db:seed:fake` reads model metadata from the generated Prisma client, uses generated fake-data factories (`packages/database/stubs/data.ts`) when available, and backfills required relation/scalar fields before inserts.

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
pnpm test:cube-helpers
pnpm typecheck
pnpm seed:fake -- --count 25 --truncate true
pnpm test:automations:update
pnpm gen:examples -- --web <next-app-name> --api <nest-app-name> --model <Model> --web-port 3100 --api-port 3101 --force true|false --skip-db-generate true|false --skip-install true|false
pnpm create:next-app -- --name <app> [--port <port>] [--sample true|false] [--force]
pnpm create:nest-app -- --name <app> [--port <port>] [--force]
pnpm create:cube-app -- --name <app> [--port <port>] [--db-type postgres] [--template docker]
pnpm add:auth -- --app <next-app-name> [--force]
pnpm update:api -- --app <nest-app-name> --model <Model>
pnpm update:api -- --app <nest-app-name> --models User,Account,Session
pnpm update:api -- --app <nest-app-name> --all
pnpm update:cube -- --app <app-name> --model <Model>
pnpm update:cube -- --app <app-name> --models User,Account
pnpm update:analytics-pages -- --app <next-app-name> --analytics-app <api-app-name> --model <Model>
pnpm create:block -- --block next-crud-pages --app <next-app-name> --model <Model>
pnpm create:block -- --block next-crud-pages --app <next-app-name> --models User,Account --list-mode infinite --layout cards --form-style two-column
pnpm create:block -- --block next-analytics-pages --app <next-app-name> --analytics-app <api-app-name> --model <Model>
pnpm create:block -- --block next-analytics-pages --app <next-app-name> --analytics-app <api-app-name> --all --layout split --profile operations
pnpm create:block -- --block next-compose-page --app <next-app-name> --preset dashboard-basic --model <Model> --route dashboard --analytics-app <api-app-name>
```

`pnpm gen:examples` runs a full root-level generation flow:

- creates a Next app (default `example-web` on port `3100`)
- creates a Nest app (default `example-api` on port `3101`)
- scaffolds a CRUD resource for one model (default `User`)
- scaffolds Cube analytics artifacts for that model in the API app
- scaffolds Next CRUD hooks and list/detail/create/edit pages for that model in the web app
- scaffolds Next analytics pages (KPI/grouped/time-series) in the web app from generated analytics contracts

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

### Create a Cube app

```bash
pnpm create:block -- --block cube-app --name cube --port 4000
pnpm create:block -- --block cube-app --name cube --db-type postgres --template docker --skip-install
pnpm create:block -- --block cube-app --name cube --skip-cube-cli
```

`cube-app` behavior:

- attempts `cubejs-cli create` first (`--cube-cli false` or `--skip-cube-cli` to force fallback templates)
- falls back to deterministic local templates if CLI bootstrap fails/unavailable
- wires workspace dependencies (`database`, `cube-helpers`, `config`) when present
- generates app CI workflow by default (`--skip-ci-workflow` to opt out)

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
pnpm create:block -- --block api-updator --app api --model User --omit-fields passwordHash,refreshToken
pnpm create:block -- --block api-updator --app api --model User --omit-sensitive false
pnpm create:block -- --block api-updator --app api --all --skip-db-generate
```

`api-updator` behavior:

- runs `pnpm --filter database db:generate`
- scaffolds CRUD endpoints/service/module wiring
- derives DTO fields from Prisma/contracts
- generates `POST /search` DTO/service/controller wiring by default (`--search false` to skip)
- applies Prisma `omit` in generated service responses for sensitive fields by default (`--omit-sensitive false` to disable)
- supports additional response field omission with `--omit-fields <csv>`
- `--all` discovers model names from Prisma schema files (`packages/database/prisma/**/*.prisma`)
- `--skip-db-generate` is available for quick local smoke tests if Prisma generators are not configured yet
- respects `/*_ no-auto-update _*/` markers when present

### Generate Cube analytics services from model contracts

```bash
pnpm create:block -- --block cube-service-updator --app api --model User
pnpm create:block -- --block cube-service-updator --app api --models User,Account
pnpm create:block -- --block cube-service-updator --app api --all
pnpm create:block -- --block cube-service-updator --app api --model User --tenant-field organizationId
pnpm create:block -- --block cube-service-updator --app api --model User --skip-db-generate
```

`cube-service-updator` behavior:

- runs `pnpm --filter database db:generate` (unless `--skip-db-generate` is passed)
- generates Cube service artifact(s) in `src/analytics/cubes/`
- generates typed analytics contracts in `src/analytics/contracts/`
- updates `src/analytics/index.ts` exports idempotently
- adds `cube-helpers` workspace dependency to the target app when missing
- supports scoped filter defaults via `--tenant-field`
- respects `/* no-auto-update */` and `/*_ no-auto-update _*/` markers

### Generate Next CRUD hooks and pages from model contracts

```bash
pnpm create:block -- --block next-crud-pages --app web --model User
pnpm create:block -- --block next-crud-pages --app web --models User,Account
pnpm create:block -- --block next-crud-pages --app web --all
pnpm create:block -- --block next-crud-pages --app web --model User --list-mode table
pnpm create:block -- --block next-crud-pages --app web --model User --list-mode infinite --layout cards --form-style two-column
pnpm create:block -- --block next-crud-pages --app web --model User --ui-preset compact --theme-token-file src/lib/crud/theme-tokens.ts
```

`next-crud-pages` behavior:

- ensures app dependencies include `@tanstack/react-query`, `axios`, and `zod`
- scaffolds `src/lib/api` query client wiring + `src/app/providers.tsx`
- patches `src/app/layout.tsx` to wrap children with `AppProviders` when possible
- generates model-specific API/hook/query-key/config files in `src/lib/<plural-model>/`
- generates `src/lib/<plural-model>/overrides.ts` for hidden/readonly/widget/validator customization
- generates list/detail/create/edit routes in `src/app/<plural-model>/`
- supports manifest-driven list behavior via `--list-mode table|infinite`
- includes optimistic create/update/delete cache updates in generated React Query hooks
- supports manifest-driven UI options: `--ui-preset`, `--layout`, `--form-style`, `--theme-token-file`

### Generate Next analytics pages from generated Cube contracts

```bash
pnpm create:block -- --block next-analytics-pages --app web --analytics-app api --model User
pnpm create:block -- --block next-analytics-pages --app web --analytics-app api --models User,Account
pnpm create:block -- --block next-analytics-pages --app web --analytics-app api --all
pnpm create:block -- --block next-analytics-pages --app web --analytics-app api --model User --layout split --profile operations --default-grain month
pnpm create:block -- --block next-analytics-pages --app web --analytics-app api --model User --route-base insights/analytics
```

`next-analytics-pages` behavior:

- reads generated analytics contracts from `apps/<analytics-app>/src/analytics/contracts/*.analytics.ts`
- generates shared analytics client/config in `src/lib/analytics/`
- generates a local Next proxy route at `src/app/api/analytics/cube/route.ts` that forwards Cube load queries to `${CUBE_API_URL}/cubejs-api/v1/load` using `CUBE_API_TOKEN` when present
- generates model-specific analytics contract + API helpers in `src/lib/analytics/<plural-model>/`
- generates route pages in `src/app/<route-base>/<plural-model>/page.tsx` with:
  - KPI totals section
  - grouped chart + grouped table section
  - time-series chart section with granularity control
- model API helpers now issue Cube load queries (summary/grouped/time-series presets) through the generated Next proxy route instead of expecting Nest analytics endpoints
- generates an analytics index route (`src/app/<route-base>/page.tsx`) linking to generated model pages
- supports semantic-layer customization flags: `--layout`, `--profile`, `--default-grain`, `--route-base`
- respects `/* no-auto-update */` and `/*_ no-auto-update _*/` markers

### Compose a custom Next page from JSON spec

Use this when you want a customizable page composition path (for example list + chart dashboard layout) instead of only out-of-the-box model blocks.

```bash
pnpm create:block -- --block next-compose-page --app web --preset dashboard-basic --model User --route dashboard --analytics-app api
pnpm create:block -- --block next-compose-page --app web --spec automations/specs/pages/dashboard-basic.json --model User --route insights/dashboard --analytics-app api
```

`next-compose-page` behavior:

- loads a JSON page spec (`--spec`) or preset (`--preset`, default `dashboard-basic`)
- resolves contract refs against:
  - database contracts in `packages/database/contracts/models/*.model.ts`
  - analytics contracts in `apps/<analytics-app>/src/analytics/contracts/*.analytics.ts`
- generates a composed page at `apps/<app>/src/app/<route>/page.tsx`
- currently supports section types:
  - `crud-list`
  - `analytics-bar-chart`
  - `analytics-line-chart`
  - `analytics-table`
- designed as a customizable path that complements existing out-of-the-box generators (`next-crud-pages`, `next-analytics-pages`)

`next-app` and `nest-app` run `pnpm install` automatically after generation.
Use `--skip-install` when chaining multiple generators and installing once at the end.

## CI model

- `.github/workflows/automations-tests.yml` is the repo-infrastructure CI pipeline for:
  - automation contract governance
  - workspace lint
  - workspace typecheck
  - automations tests
  - UI tests + coverage artifact
  - cube-helpers unit tests
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

### Cube helpers package (`packages/cube-helpers`)

```bash
pnpm --filter cube-helpers build
pnpm --filter cube-helpers typecheck
pnpm --filter cube-helpers test
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
