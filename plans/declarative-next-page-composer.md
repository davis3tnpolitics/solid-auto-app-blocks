# Declarative Next Page Composer Plan

## Status

Drafted on March 14, 2026.

Planned:

- add a generic `next-compose-page` generator block
- introduce a JSON page-spec contract that composes list/chart/table sections
- let manifests point to specs/presets instead of requiring a new generator per page type

## Goal

Enable teams to create new Next.js pages (for example `dashboard`) by configuration, where manifests can supply a JSON spec that defines route, layout, and component sections, while preserving out-of-the-box model-based generators as the default fast path.

## Scope

1. Define a page-composer JSON schema/contract.
2. Build a single generator that consumes the schema and emits a page.
3. Add manifest support for page-spec-driven generation.
4. Provide default section/component presets (list + chart first).
5. Tie generation to existing database and analytics contracts.
6. Add tests, docs, and governance checks for spec validity.

## Non-Goals

1. Replacing existing `next-crud-pages` and `next-analytics-pages` blocks immediately.
2. Drag-and-drop visual page builder UI.
3. Runtime dynamic rendering from JSON in production pages (v1 is generation-time only).

## Positioning

This composer is a customizable path, not a replacement default:

1. Default path: use existing out-of-the-box blocks for fast model scaffolding.
2. Custom path: use JSON-driven composer when teams need bespoke page layouts/section mixes.

---

## Slice 1: Spec Contract Design

### Deliverables

1. Create a page-spec schema, for example:
   - `kind` (`next-page-spec`)
   - `version`
   - `app`
   - `route`
   - `title` / `description`
   - `layout` (`stack`, `split`, `grid`)
   - `sections[]`
2. Define first-class section types:
   - `crud-list`
   - `analytics-bar-chart`
   - `analytics-line-chart`
   - `analytics-table`
3. Define data bindings in spec:
   - model and route keys
   - hook/api references (or inferred defaults)
4. Add JSON schema validation file in `automations/manifests` or `automations/scripts/schemas`.

### Exit Criteria

1. Spec supports a real `dashboard` page with list + chart.
2. Spec validation catches missing required fields before generation.

---

## Slice 2: Generic Composer Generator

### Deliverables

1. Add `automations/generators/next-compose-page.js`.
2. Generator inputs:
   - `--app`
   - `--spec <path>`
   - `--force`
3. Generator behavior:
   - load + validate spec
   - scaffold `src/app/<route>/page.tsx`
   - compose imports and JSX blocks from section definitions
4. Add a component/section registry in generator code:
   - map section `type` -> template renderer function
5. Honor existing no-auto-update guardrails.

### Exit Criteria

1. One generator can build multiple page shapes from different specs.
2. Generated code is typed and passes app typecheck.

---

## Slice 3: Manifest + Preset Integration

### Deliverables

1. Add manifest `automations/manifests/next-compose-page.json`.
2. Add optional preset mode:
   - `--preset dashboard-basic`
   - maps to stored JSON specs in `automations/specs/pages/*.json`
3. Keep create-block UX:
   - `pnpm create:block -- --block next-compose-page --app web --preset dashboard-basic`
   - `pnpm create:block -- --block next-compose-page --app web --spec automations/specs/pages/dashboard.json`

### Exit Criteria

1. Users can generate dashboard pages through block + spec, no new generator needed.
2. Manifest contract stays minimal and clear.

---

## Slice 4: Data Binding + Smart Defaults

### Deliverables

1. Add inference rules so common fields can be omitted in spec:
   - infer hook names from model (for list sections)
   - infer analytics api helpers from model route segment
2. Add explicit override fields when inference is insufficient.
3. Add stable defaults for:
   - page container/layout classes
   - loading/empty/error states
   - chart/table options

### Exit Criteria

1. Spec authoring is concise for common cases.
2. Advanced cases are still possible with explicit overrides.

---

## Slice 5: Contract Integration Layer

### Deliverables

1. Add contract resolvers for database model contracts:
   - source: `packages/database/contracts/models/*.model.ts`
   - use: field metadata for list/table/detail/form section generation
2. Add contract resolvers for analytics contracts:
   - source: `apps/<analytics-app>/src/analytics/contracts/*.analytics.ts`
   - use: dimensions/measures/timeDimensions for chart/table sections
3. Support section-level `contractRef` in page spec:
   - example: `{ source: "database", model: "User" }`
   - example: `{ source: "analytics", app: "api", model: "User" }`
4. Add fallback behavior when contract refs are missing:
   - explicit validation errors for required contract-backed section types
   - optional manual override fields for advanced custom sections

### Exit Criteria

1. Composer can derive section wiring from real contracts with minimal manual config.
2. Contract mismatches fail early with clear diagnostics.

---

## Slice 6: Tests + Governance

### Deliverables

1. Unit tests for spec parsing and section renderers.
2. Contract tests for schema validation failures.
3. Smoke tests in `automations/tests`:
   - generate dashboard from preset
   - generate dashboard from custom spec file
4. Governance checks:
   - ensure preset specs are valid against schema
   - ensure README docs include new block command

### Exit Criteria

1. Invalid specs fail fast with readable errors.
2. Generated output remains stable under snapshot/smoke tests.

---

## Slice 7: Docs + Rollout

### Deliverables

1. Document spec format and section catalog in README.
2. Add examples:
   - dashboard (list + bar chart)
   - dashboard (list + line chart + table)
3. Document this as a customizable path alongside existing out-of-the-box generators.
4. Keep old generators supported during transition.

### Exit Criteria

1. Team can author a new page by editing JSON + running one block command.
2. No custom generator file is needed for standard page-composition requests.

---

## Recommended Execution Order

1. Slice 1
2. Slice 2
3. Slice 3
4. Slice 5
5. Slice 6
6. Slice 4
7. Slice 7

This order ships a minimal but usable composer early, then hardens it with validation/tests before expanding smart inference behavior.

## MVP Definition of Done

1. `next-compose-page` block exists and is documented.
2. A `dashboard` preset spec can generate a page with list + chart.
3. Spec validation is enforced before writes.
4. Smoke tests cover preset and custom spec flows.
5. Team can create new composed pages by spec + manifest, without new generator scripts.
