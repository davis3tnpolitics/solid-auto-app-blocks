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
- `cube-app` manifest + generator for Cube app scaffolding with Cube CLI-first bootstrap and deterministic fallback templates.

### Changed

- `gen:examples` and generator docs now align with workflow-first CI behavior for generated apps.
- `examples` workflow now chains API CRUD + Cube analytics + `next-crud-pages` to scaffold end-to-end CRUD and analytics contracts.
