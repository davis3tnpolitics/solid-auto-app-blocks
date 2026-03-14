---
name: solid-block-stubber
description: Convert rough product ideas into concrete scaffolding actions for the solid-auto-app-blocks monorepo. Use when asked to stub, scaffold, bootstrap, or spin up apps/features with existing automations (create:block, create:workflow, add:auth, update:api, update:cube, analytics page generation) and produce working code quickly with clear assumptions.
---

# Solid Block Stubber

## Overview

Turn ambiguous feature requests into a minimal, reproducible scaffolding plan.
Prefer running existing generators over hand-writing boilerplate.

## Execute The Stub Workflow

1. Identify intent and choose the smallest generator set.
Infer defaults when needed, then state assumptions in output.
Use this default set unless user specifies otherwise: web app `web`, api app `api`, model `User`, ports `3000/3001`.

2. Inspect generator contract before running.
Read the selected manifest(s) in `automations/manifests/*.json`.
Confirm required flags and allowed options before composing commands.

3. Dry-run first when risk is non-trivial.
Use `pnpm create:block -- --block <name> --dry-run ...` before real execution when:
- `--force true` is used
- the app/module target already exists
- multiple generators are chained

4. Run generators in dependency order.
Create base apps first (`next-app`, `nest-app`, `cube-app`), then update generators (`api-updator`, `cube-service-updator`, `next-crud-pages`, `next-analytics-pages`, `add-auth`).
Use `create:workflow` when a saved workflow already matches the request.

5. Verify the scaffold.
Run repo validation commands that are available in the environment:
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test` or `pnpm test:automations` for generator-focused changes
If dependencies or executables are unavailable, report the blocker and the exact command not run.

## Select Generators Quickly

Use [references/block-catalog.md](references/block-catalog.md) for the full catalog.

Match user intent to generators:
- New Next.js app: `next-app`
- New NestJS app: `nest-app`
- New Cube service app: `cube-app`
- Add web authentication: `add-auth`
- Add or refresh API CRUD resources from Prisma contracts: `api-updator`
- Add or refresh Cube analytics service artifacts: `cube-service-updator`
- Generate Next CRUD pages from model contracts: `next-crud-pages`
- Generate Next analytics pages from analytics contracts: `next-analytics-pages`
- Add app-scoped GitHub Actions CI workflow: `github-workflow-app`
- Scaffold full example stack: `create:workflow -- --workflow examples`

## Compose Commands Deterministically

Prefer explicit flags and values.
Use `--flag value` or `--flag=value` format only.
Use explicit boolean values (`true` or `false`) when passing value-bearing boolean options.

Command pattern:
```bash
pnpm create:block -- --block <block-name> <flags>
```

Workflow pattern:
```bash
pnpm create:workflow -- --workflow <workflow-name> <variables>
```

Fallback when PNPM script wrappers are unavailable:
```bash
node automations/scripts/create-block.mjs --block <block-name> <flags>
node automations/scripts/create-workflow.mjs --workflow <workflow-name> <variables>
```

## Return A Structured Result

Return these sections after execution:
- Goal summary
- Selected block(s) and why
- Assumptions used
- Commands executed
- Files created or modified
- Verification results
- Next action options

## Guardrails

Check target existence before update generators:
- `api-updator`, `cube-service-updator`, `next-crud-pages`, `next-analytics-pages`, `add-auth`, `github-workflow-app` require existing app context.

Avoid broad regeneration by default:
- Skip `--all` unless user explicitly asks for all resources.

Acknowledge overwrite risk:
- Call out `--force true` impact before execution when existing files will be replaced.
