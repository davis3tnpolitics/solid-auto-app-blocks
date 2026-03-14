# CubeJS Services + Helpers Plan

## Status

Updated on March 14, 2026.

This plan has been converted from proposal mode to execution-tracker mode.

### Progress Snapshot

1. Slice 1: Complete
2. Slice 2: Complete
3. Slice 3: Complete (pivoted to direct Cube consumption via generated Next proxy route)
4. Slice 4: Partial
5. Slice 5: Complete
6. Slice 6: Partial
7. Slice 7: Partial

## Goal

Ship a stable, manifest-driven Cube semantic layer that can:

1. Generate model analytics artifacts from Prisma contracts.
2. Expose typed contracts that API and web consumers can use safely.
3. Evolve into full analytics page generation with reusable UI primitives.

## Scope

1. Manifest-driven Cube service generation from selected Prisma models.
2. Reusable `packages/cube-helpers` abstractions.
3. Typed contracts for generated artifacts and downstream consumers.
4. Test, CI, and governance gates that protect contract stability.

## Non-Goals

1. Covering every BI edge case in v1.
2. Replacing Cube-native capabilities with custom wrappers.
3. Delivering a final dashboard design system in this plan.

---

## Current Implemented Surface

1. `cube-service-updator` manifest and generator:
   - `--app`, `--model`, `--models`, `--all`, `--tenant-field`, `--skip-db-generate`, `--force`
   - generated outputs in `src/analytics/cubes`, `src/analytics/contracts`, and `src/analytics/index.ts`
2. `cube-helpers` package:
   - typed contracts (`AnalyticsQueryContract`, cube dimension/measure/time/pre-aggregation types)
   - baseline builders for default measures/time dimensions/pre-aggregations
3. workflow integration:
   - `examples` workflow chains API CRUD generation + cube analytics generation + web CRUD pages + web analytics pages
4. automated coverage:
   - unit + e2e + snapshot tests for `cube-service-updator` and `next-analytics-pages`
   - governance/manifest checks and CI execution paths already present

---

## Dependency Sequencing With Next CRUD Plan

1. Keep Cube service + contract generation independent (already in place).
2. Generate web analytics consumer scaffolding directly from contracts (no required Nest analytics route layer).
3. Generate analytics page blocks after Cube contracts and proxy wiring are standardized.

Target sequence:

1. generate Cube services/contracts
2. generate Next analytics client/proxy + model query helpers
3. generate analytics pages/components consuming Cube through the proxy

---

## Slice 1: Foundation and Package Setup

### Status

Complete.

### Delivered

1. `packages/cube-helpers` scaffold with typed exports.
2. Builders for dimensions/measures/time windows/pre-aggregations.
3. Package scripts and import-ready public entrypoints.

### Exit Criteria Check

1. Importable by generators and apps: met.
2. Stable typed helper entrypoints: met for baseline API.

---

## Slice 2: Cube Service Generator (Single Model)

### Status

Complete.

### Delivered

1. Manifest-backed `cube-service-updator` generator.
2. Generated cube artifact + analytics contract per model.
3. No-auto-update safeguards and idempotent index export updates.

### Exit Criteria Check

1. One-command generation for a model: met.
2. Deterministic reruns with safety controls: met.

---

## Slice 3: Service-to-Consumer Contracts

### Status

Complete (direct Cube mode).

### Delivered

1. Generated typed contract files under `src/analytics/contracts`.
2. Scoped filter contract support through `--tenant-field`.
3. Stable path conventions for generated cube artifacts.
4. Generated Next analytics proxy route (`/api/analytics/cube`) and model query helpers that execute Cube load queries directly from analytics contracts.

### Exit Criteria Check

1. Stable typed consumer contract: met (web analytics helper layer now generated from contracts).
2. Explicit tenancy defaults: met through scoped filter propagation into generated Cube queries.

---

## Slice 4: Multi-Model and Rich Aggregation Profiles

### Status

Partial.

### Delivered

1. Multi-model generation (`--models`, `--all`) is implemented.
2. Baseline pre-aggregation/time-dimension defaults exist in helper builders.

### Remaining

1. Profile-level generation options (safe baseline vs. configurable profile presets).
2. Flags for dimension include/exclude, grain presets, and derived metric templates.
3. First-class caching/pre-aggregation profile hooks at generator level.

### Exit Criteria Check

1. Simple multi-model use case: met.
2. Advanced profile customization without forking: not yet met.

---

## Slice 5: Analytics Page Block Generation (Depends on Next CRUD)

### Status

Complete.

### Delivered

1. Added `next-analytics-pages` manifest + generator block.
2. Generated baseline analytics sections:
   - KPI summary
   - grouped table/chart
   - time-series with grain controls
3. Reused shared `packages/ui` primitives (`DataBars`, `BarChartCard`, `LineChartCard`, `Table`, `ChartCard`, Cube adapters).
4. Added semantic-layer customization flags:
   - `--layout` (`stacked`, `split`)
   - `--profile` (`overview`, `operations`, `executive`)
   - `--default-grain` (`day`, `week`, `month`, `quarter`, `year`)
   - `--route-base` for custom analytics route namespaces
5. Added workflow integration and test coverage (unit + e2e + snapshot).
6. Pivoted generated analytics data access to direct Cube load calls through `src/app/api/analytics/cube/route.ts` (no required Nest analytics summary/grouped/timeseries endpoints).

### Exit Criteria

1. Analytics pages generated from manifests, not hand-wired: met.
2. Generated pages align with existing CRUD generation conventions: met.

---

## Slice 6: Test Strategy and Contract Stability

### Status

Partial.

### Delivered

1. Generator unit tests for discovery, flag logic, and safeguards.
2. Snapshot contract coverage for generated artifacts.
3. E2E `create:block` and `create:workflow` smoke coverage including cube step.
4. Dedicated `cube-helpers` unit tests for builders/patterns edge cases (`packages/cube-helpers/test`).

### Remaining

1. Expanded regression coverage for advanced analytics profile options (once Slice 4 lands).

### Exit Criteria Check

1. Generator regressions are detectable: met.
2. Full helper+generator stability envelope: partially met (advanced profile coverage pending Slice 4).

---

## Slice 7: CI + Governance

### Status

Partial.

### Delivered

1. CI runs automation tests and governance checks.
2. Manifest/workflow contract linting is enforced.
3. Changelog/docs sync checks exist for automation contract changes.

### Remaining

1. Query-performance budget checks for representative analytics scenarios.
2. Security filter coverage checks for generated analytics artifacts.
3. Explicit governance policy for helper API breaking changes.

### Exit Criteria Check

1. Baseline CI governance for generator contracts: met.
2. Operational analytics quality gates: not yet met.

---

## Next Milestones (What to Build Next)

1. Harden direct Cube consumer scaffolding (typed query presets + scoped filter handling + proxy resilience).
2. Complete Slice 4 by introducing profile flags and customizable aggregation templates.
3. Complete Slice 7 operational gates (performance/security checks).
4. Continue expanding regression coverage for advanced profile options after Slice 4 lands.

---

## Updated Recommended Execution Order

1. Slice 4 completion (rich profile generation)
2. Slice 7 completion (operational governance)
3. Direct Cube proxy hardening tests and docs polish

This order keeps the direct Cube path stable first, then unlocks richer generation and operational governance.
