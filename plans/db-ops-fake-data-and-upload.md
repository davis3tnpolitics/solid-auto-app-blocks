# DB-Ops Fake Data + Upload Plan

## Status

Drafted on March 14, 2026.

Planned:

- remove `packages/communications`
- replace `packages/dev-ops` with a focused `packages/db-ops`
- ship a schema-driven fake data generator/uploader as the first `db-ops` capability

## Goal

Create a dependable `db-ops` package that can generate and upload realistic fake data from the Prisma schema with deterministic behavior, strong safety controls, and CI-backed confidence.

## Scope

1. Workspace/package transition from communications/dev-ops to db-ops.
2. Prisma schema introspection and relation-aware model ordering.
3. Fake data generation by model/field with deterministic seeding.
4. Database upload pipeline with batching, retries, and guardrails.
5. CLI entrypoints and automation integration for repeatable usage.
6. Test coverage and documentation for local + CI usage.

## Non-Goals

1. Production ETL/data migration workflows.
2. Building a full synthetic data modeling DSL in v1.
3. Queue/distributed worker orchestration in v1.

---

## Slice 1: Workspace Transition

### Deliverables

1. Remove `packages/communications` and clean docs/workspace references.
2. Rename/replace `packages/dev-ops` as `packages/db-ops`.
3. Add baseline package structure:
   - `packages/db-ops/package.json`
   - `packages/db-ops/tsconfig.json`
   - `packages/db-ops/src/index.ts`
   - `packages/db-ops/README.md`
4. Add root script wiring:
   - `db:ops:seed`
   - `db:ops:plan`

### Exit Criteria

1. Workspace builds/typechecks with new package name.
2. No stale communications references remain.

---

## Slice 2: Prisma Introspection + Seed Plan

### Deliverables

1. Load Prisma metadata from generated client/DMMF.
2. Build a model dependency graph from required relations.
3. Resolve deterministic generation order (parents before children).
4. Add a planning command that prints:
   - selected models
   - dependency order
   - estimated record counts

### Exit Criteria

1. `db:ops:plan` returns stable model ordering for repeated runs.
2. Relation-heavy schemas produce valid dependency order.

---

## Slice 3: Package-Backed Stub Generation (Prisma Fake Data)

### Deliverables

1. Use `prisma-generator-fake-data` as the default stub engine (already configured in Prisma generator block).
2. Treat generated stubs (for example `packages/database/stubs/data.ts`) as the primary fake-data source for `db-ops`.
3. Add db-ops adapters that normalize generated stub output per model before upload:
   - required/optional/nullability enforcement
   - relation placeholder handling (foreign keys resolved during upload stage)
4. Add deterministic-run support at the db-ops layer (`--seed`) so repeated runs remain stable.
5. Add override hooks for project-specific fields without forking generator output:
   - per-model patch function
   - per-field value override map
6. Keep custom scalar fallbacks as a minimal safety net only when generated stubs omit required values.

### Exit Criteria

1. `db-ops` can seed from package-generated stubs without custom type-by-type generators.
2. Generated + normalized payloads satisfy schema constraints in tests.
3. Same seed + args produce stable output.

---

## Slice 4: Upload/Persistence Engine

### Deliverables

1. Persist generated records in dependency-safe order.
2. Use `createMany` for bulk-safe paths and `create` for relation-aware paths.
3. Support batching and configurable chunk sizes.
4. Add retry policy for transient write failures.
5. Add CLI safety controls:
   - `--dry-run`
   - `--truncate`
   - `--force`
   - `--models`
   - `--count`

### Exit Criteria

1. End-to-end seeding works on a real DB for multi-model schemas.
2. Dry-run performs no writes.
3. Truncate is blocked outside explicit force flows.

---

## Slice 5: CLI Contract + Automation Hook

### Deliverables

1. Implement CLI commands:
   - `pnpm db:ops:plan --all`
   - `pnpm db:ops:seed --all --count 50`
   - `pnpm db:ops:seed --models User,Account --count 100 --seed 42`
   - `pnpm db:ops:seed --all --truncate true --force true`
2. Add concise command output with progress and summary counts.
3. Add automation manifest entry (for semantic-layer usage), e.g. `seed-fake-data`.

### Exit Criteria

1. CLI is documented, predictable, and scriptable.
2. Automation runner can invoke seeding through manifest contract.

---

## Slice 6: Tests + CI + Docs

### Deliverables

1. Unit tests for:
   - dependency graph ordering
   - deterministic field generation
   - unique/collision strategy
2. Integration tests against temp DB:
   - single-model seed
   - relation graph seed
   - truncate + reseed
3. Wire `db-ops` into root quality gates (`typecheck`, `test`, `verify`).
4. Document:
   - quickstart usage
   - safe defaults
   - troubleshooting common failures

### Exit Criteria

1. CI fails on db-ops regressions.
2. New contributors can seed fake data from docs alone.

---

## Recommended Execution Order

1. Slice 1
2. Slice 2
3. Slice 3
4. Slice 4
5. Slice 5
6. Slice 6

This order establishes package and schema intelligence first, then generation/upload behavior, and finally hardens usage with tests, CI, and docs.

## MVP Definition of Done

1. One command can seed all Prisma models into a dev database.
2. Required relations are handled automatically.
3. Runs are deterministic with `--seed`.
4. Safety controls (`--dry-run`, `--truncate`, `--force`) are enforced.
5. Tests and docs are in place for reliable team usage.
