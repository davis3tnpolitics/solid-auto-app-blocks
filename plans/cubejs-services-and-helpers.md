# CubeJS Services + Helpers Plan

## Status

Updated on February 23, 2026.

## Goal

Add a manifest-driven CubeJS semantic layer that scaffolds analytics services per model (similar to `api-updator`) and establish a shared `cube-helpers` package for reusable analytics patterns.

## Scope

1. Create a manifest-driven generator for CubeJS services from selected Prisma models.
2. Create `packages/cube-helpers` as the reusable analytics abstraction layer.
3. Support flexible analytics patterns (totals, grouped aggregations, date buckets, rollups, derived metrics, and domain-specific dimensions).
4. Define stable contracts from generated Cube services to app/API consumers.
5. Add manifest blocks that can scaffold analytics-oriented frontend pages once base CRUD scaffolding exists.
6. Add tests, governance, and CI gates so generated analytics contracts stay stable.

## Non-Goals

1. Solving every BI/semantic edge case in v1.
2. Replacing CubeJS-native features with bespoke wrappers.
3. Shipping a final, one-size-fits-all dashboard design system.

---

## What Was Missing (Now Explicit)

1. A hard contract between generated Cube artifacts and downstream consumers (API/web).
2. Tenancy/security filter conventions (required scoped filters, safe defaults).
3. Pre-aggregation/caching conventions for cost and performance.
4. Observability conventions (query logging hooks, slow-query thresholds, trace ids).
5. Clear dependency sequencing with Next CRUD generation work.

---

## Dependency Sequencing With Next CRUD Plan

1. `cube-helpers` and Cube service generation should start now (independent of page templates).
2. Analytics page block generation should run after Next CRUD plan has delivered reusable UI primitives and route-generation contracts (`CrudList`, `CrudTable`, `CrudDetail`, `CrudForm`, plus manifest options).
3. The target flow should be:
   - generate Cube services
   - generate API-facing analytics contracts/routes
   - generate manifest-driven analytics page blocks that render charts/tables against those contracts

---

## Slice 1: Foundation and Package Setup

### Deliverables

1. Add `packages/cube-helpers` scaffold:
   - typed analytics contracts
   - utilities for dimensions/measures/time windows
   - helper builders for totals and grouped aggregations
2. Add package scripts:
   - `build`
   - `typecheck`
   - `lint` (if package lint baseline is active)
3. Add versioning/contract boundaries for public helper APIs.

### Exit Criteria

1. `cube-helpers` can be imported by generators and Cube app code.
2. Package exposes stable typed entrypoints for common analytics operations.

---

## Slice 2: Cube Service Generator (Single Model)

### Deliverables

1. Add generator block (for example `cube-service-updator`) with manifest.
2. Generate Cube service artifacts for one model:
   - dimensions
   - base measures
   - totals
   - common aggregations (`count`, `sum`, `avg`, `min`, `max`)
3. Include flags aligned with existing automation style:
   - `--model`
   - `--app`
   - `--force`
   - `--skip-db-generate` (if relevant)
4. Respect `/* no-auto-update */` directives in generated files.

### Exit Criteria

1. One command scaffolds analytics service files for a model.
2. Output is deterministic and safe to rerun.

---

## Slice 3: Service-to-Consumer Contracts

### Deliverables

1. Define generated query/response contracts used by API and frontend consumers.
2. Add naming and path conventions for generated analytics endpoints.
3. Add required guardrails for scoped filters (tenant/org/user boundary patterns).
4. Add extension hooks for domain-specific filters and computed metrics.

### Exit Criteria

1. Consumers can rely on a stable, typed analytics contract.
2. Security/tenancy defaults are explicit and testable.

---

## Slice 4: Multi-Model and Rich Aggregation Profiles

### Deliverables

1. Support `--models` and `--all` model selection.
2. Add aggregation profile support:
   - default profile (safe baseline)
   - configurable profile (custom totals, groupings, rollup windows)
3. Add nuanced analytics flags:
   - time-grain presets
   - dimension include/exclude lists
   - derived metric templates
4. Add pre-aggregation and caching profile hooks.

### Exit Criteria

1. Generator supports both simple and advanced analytics use cases.
2. Teams can customize output without forking generator internals.

---

## Slice 5: Analytics Page Block Generation (Depends on Next CRUD)

### Deliverables

1. Add manifest block(s) for analytics page scaffolding that consume generated analytics contracts.
2. Generate baseline analytics pages/components:
   - KPI/total summary section
   - grouped chart/table section
   - time-series section with date-grain controls
3. Reuse shared UI primitives from `packages/ui` and the CRUD-generation foundation.
4. Provide semantic-layer customization flags (layout/profile-level options).

### Exit Criteria

1. Analytics pages can be generated from manifests, not hand-wired one-offs.
2. Generated pages align with existing app CRUD/UI generation patterns.

---

## Slice 6: Test Strategy and Contract Stability

### Deliverables

1. Unit tests for helper package:
   - totals/aggregation logic
   - time window normalization
   - edge cases (null values, sparse data, mixed types)
2. Generator unit tests:
   - model discovery
   - naming/path behavior
   - flag parsing and guardrails
3. Snapshot/contract tests for representative generated Cube service files.
4. E2E smoke coverage via `create:block`.

### Exit Criteria

1. Generator/helper behavior is regression-resistant.
2. Contract changes are obvious in snapshot diffs.

---

## Slice 7: CI + Governance

### Deliverables

1. Add Cube generator/helper tests to CI gates.
2. Add governance checks:
   - manifest schema/entry validation
   - contract test updates for behavioral changes
   - changelog policy for breaking contract changes
3. Add operational quality gates:
   - required performance budget checks for representative queries
   - required security filter coverage checks

### Exit Criteria

1. Cube generator/helper contracts are CI-enforced.
2. Changes remain traceable, reviewable, and production-safe.

---

## Recommended Execution Order

1. Slice 1
2. Slice 2
3. Slice 3
4. Slice 6
5. Slice 4
6. Slice 5 (after Next CRUD slices that provide reusable UI/page infrastructure)
7. Slice 7

This order ships a stable semantic baseline early, hardens contracts/tests before expansion, then layers analytics-page generation after the Next CRUD foundation is ready.
