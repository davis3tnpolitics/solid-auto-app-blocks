# Changelog

All notable changes to this repository are documented in this file.

## [Unreleased]

### Added

- Root DX scripts for workspace development/validation: `dev`, `build`, `lint`, `verify`.
- Automation governance lint script: `pnpm lint:automation-contracts`.
- `github-workflow-app` generator block to scaffold app CI workflows under `.github/workflows`.
- Default app CI workflow generation in `next-app` and `nest-app` generators.
- Expanded repo-infrastructure CI gates (governance, lint, typecheck, automations tests, UI tests).
- `next-crud-pages` manifest + generator for model-driven Next CRUD hooks/pages (`list`, `detail`, `create`, `edit`) with TanStack Query + Axios scaffolding.
- Shared UI CRUD primitives in `@workspace/ui`: `CrudList`, `CrudTable`, `CrudDetail`, `CrudForm`.
- Generated CRUD list pages now support manifest-selected list behavior via `--list-mode table|infinite` with table pagination or infinite-scroll query wiring.
- Generated CRUD model overrides scaffold (`overrides.ts`) to customize hidden/readonly fields, widgets, and per-field Zod validators.
- `cube-service-updator` manifest + generator for model-driven Cube analytics scaffolding (`src/analytics/cubes`, `src/analytics/contracts`, `src/analytics/index.ts`).
- New `cube-helpers` package with typed Cube semantic-layer builders for dimensions/measures/time windows/pre-aggregations.
- Dedicated `cube-helpers` unit test suite (`packages/cube-helpers/test`) plus root script `pnpm test:cube-helpers`.
- `cube-app` manifest + generator for Cube app scaffolding with Cube CLI-first bootstrap and deterministic fallback templates.
- `next-analytics-pages` manifest + generator for model-driven Next analytics pages (KPI totals, grouped chart/table, time-series controls) generated from Cube analytics contracts.
- `next-compose-page` manifest + generator for customizable, spec-driven Next page composition (JSON preset/spec) with contract-aware list/chart/table sections.
- Root fake-data seeding script: `pnpm seed:fake` (backed by `packages/database/scripts/db-seed-fake.ts`) for schema-driven local test data insertion.
- Template smoke script: `pnpm smoke:template` (`automations/scripts/template-smoke.mjs`) to validate end-to-end generation in a disposable workspace.

### Changed

- `gen:examples` and generator docs now align with workflow-first CI behavior for generated apps.
- `examples` workflow now chains API CRUD + Cube analytics + `next-crud-pages` + `next-analytics-pages` to scaffold end-to-end CRUD and analytics contracts/pages.
- Pnpm override pins `prisma-generator-fake-data`'s transitive `@faker-js/faker` dependency to a CommonJS-compatible version (`8.4.1`) so `pnpm --filter database db:generate` works reliably in this workspace.
- `next-analytics-pages` now generates direct Cube query consumers and a Next proxy route (`src/app/api/analytics/cube/route.ts`) instead of expecting Nest summary/grouped/timeseries analytics endpoints.
- Repo infrastructure CI now runs cube-helpers unit tests as a first-class gate.
- Repo infrastructure CI now runs a `template-smoke` job that executes full workflow generation plus composed dashboard page generation.
- Removed the `packages/communications` placeholder package from the template workspace.
