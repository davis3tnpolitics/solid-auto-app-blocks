# Block Catalog

Use this catalog to map requests to the smallest valid scaffold command.

## Core Commands

```bash
pnpm create:block -- --block <block-name> <flags>
pnpm create:workflow -- --workflow <workflow-name> <variables>
```

Fallback:

```bash
node automations/scripts/create-block.mjs --block <block-name> <flags>
node automations/scripts/create-workflow.mjs --workflow <workflow-name> <variables>
```

## Block Selection Matrix

`next-app`
- Use for: Create a new Next.js app in `apps/<name>`.
- Required: `--name <app>`
- Common flags: `--port <number>`, `--sample <true|false>`, `--skip-install`, `--ci-workflow`, `--force <true|false>`
- Example: `pnpm create:block -- --block next-app --name web --port 3000 --force true`

`nest-app`
- Use for: Create a new NestJS app in `apps/<name>`.
- Required: `--name <app>`
- Common flags: `--port <number>`, `--skip-install`, `--ci-workflow`, `--force <true|false>`
- Example: `pnpm create:block -- --block nest-app --name api --port 3001 --force true`

`cube-app`
- Use for: Create a new Cube app in `apps/<name>`.
- Required: `--name <app>`
- Common flags: `--port <number>`, `--db-type <type>`, `--template <name>`, `--skip-install`, `--cube-cli`, `--skip-cube-cli`, `--force <true|false>`
- Example: `pnpm create:block -- --block cube-app --name cube --port 4000 --skip-install --force true`

`add-auth`
- Use for: Add Auth.js routing and middleware to an existing Next app.
- Required: `--app <existing-next-app>`
- Common flags: `--force <true|false>`
- Example: `pnpm create:block -- --block add-auth --app web --force true`

`api-updator`
- Use for: Generate Nest CRUD resources from Prisma contracts.
- Required: none
- Common flags: `--app <api-app>`, `--model <Model>`, `--models <ModelA,ModelB>`, `--resource <name>`, `--all`, `--search`, `--omit-sensitive`, `--omit-fields <fieldA,fieldB>`, `--skip-db-generate`, `--force <true|false>`
- Example: `pnpm create:block -- --block api-updator --app api --model User --force true`

`cube-service-updator`
- Use for: Generate Cube analytics service artifacts from Prisma contracts.
- Required: `--app <api-app>`
- Common flags: `--model <Model>`, `--models <ModelA,ModelB>`, `--all`, `--tenant-field <field>`, `--skip-db-generate`, `--force <true|false>`
- Example: `pnpm create:block -- --block cube-service-updator --app api --model User --force true`

`next-crud-pages`
- Use for: Generate CRUD hooks and pages for an existing Next app.
- Required: `--app <next-app>`
- Common flags: `--model <Model>`, `--models <ModelA,ModelB>`, `--all`, `--ui-preset <preset>`, `--layout <layout>`, `--list-mode <mode>`, `--form-style <style>`, `--theme-token-file <path>`, `--force <true|false>`
- Example: `pnpm create:block -- --block next-crud-pages --app web --model User --force true`

`next-analytics-pages`
- Use for: Generate analytics pages/components in an existing Next app.
- Required: `--app <next-app>`
- Common flags: `--analytics-app <api-app>`, `--model <Model>`, `--models <ModelA,ModelB>`, `--all`, `--route-base <route>`, `--layout <layout>`, `--profile <profile>`, `--default-grain <grain>`, `--force <true|false>`
- Example: `pnpm create:block -- --block next-analytics-pages --app web --analytics-app api --model User --force true`

## Flag Semantics

- `--models` means a comma-separated model list in the CLI argument, not a CSV file path.
- Source of truth remains Prisma schema/contracts under `packages/database`.

`github-workflow-app`
- Use for: Add app-scoped GitHub Actions workflow in `.github/workflows`.
- Required: `--app <app>`
- Common flags: `--framework <next|nest|cube>`, `--force <true|false>`
- Example: `pnpm create:block -- --block github-workflow-app --app api --framework nest --force true`

## Workflow Shortcuts

`examples`
- Use for: Scaffold a paired Next+Nest stack and generate API/Cube/CRUD/analytics artifacts.
- Variables: `--web`, `--api`, `--model`, `--web-port`, `--api-port`, `--force`, `--skip-db-generate`
- Example: `pnpm create:workflow -- --workflow examples --web web --api api --model User --force true`

## Quick Mapping Heuristics

- User says "new app" -> `next-app` or `nest-app` or `cube-app`.
- User says "add CRUD routes/resources" -> `api-updator`.
- User says "generate pages from model" -> `next-crud-pages`.
- User says "analytics dashboard/pages" -> `cube-service-updator` then `next-analytics-pages`.
- User says "wire auth" -> `add-auth`.
- User says "full starter stack" -> `create:workflow examples`.
