# UI CubeJS Adapters + Test Plan

## Status

Completed on February 23, 2026.

Implemented in:

- `packages/ui/lib/cubejs-adapters.ts`
- `packages/ui/lib/cubejs-adapters.test.ts`
- `packages/ui/components/charts/charts.test.tsx`
- `packages/ui/components/forms/fields.test.tsx`
- `packages/ui/components/ui/interactions.test.tsx`
- `packages/ui/components/ui/primitives.smoke.test.tsx`
- `packages/ui/vitest.config.ts`

## Goal

Create reusable `packages/ui/lib` functions that transform CubeJS API responses into stable chart-ready data for existing chart components in `packages/ui/components/charts`, then add a layered UI test strategy with prioritized coverage.

---

## Scope

1. Add adapter functions in `packages/ui/lib` for CubeJS result shaping.
2. Keep chart components mostly presentation-focused (no heavy transformation logic inside components).
3. Add robust tests in `packages/ui` with coverage gates and phased rollout.

---

## Slice 1: Foundations and Contracts

### Deliverables

1. Define adapter contracts in `packages/ui/lib`:
   - common input type for CubeJS result sets (raw rows + metadata)
   - normalized output types for chart-friendly series/points/categories
2. Add utility helpers for:
   - dimension extraction
   - measure parsing
   - null/undefined handling
   - date/time bucket normalization
3. Add docs note in `packages/ui/README.md` describing adapter entrypoints.

### Exit criteria

- Adapter API shape is clear and typed.
- Existing charts can consume normalized output without relying on CubeJS internals directly.

---

## Slice 2: Core Adapter Implementations (lib first)

### Deliverables

Implement primary transformation functions in `packages/ui/lib`:

1. Single-series categorical adapter
2. Multi-series categorical adapter
3. Time-series adapter (date bucket to x-axis points)
4. Stacked/segmented adapter (for bars/areas where grouping matters)
5. Table/list adapter for chart-adjacent components (if needed by existing chart cards)

Normalization rules:

- deterministic key naming
- explicit sorting behavior
- numeric coercion and fallback to `0` where appropriate
- safe handling of missing categories/measures

### Exit criteria

- Adapters cover the shapes required by current charts directory.
- Transformations are deterministic and strongly typed.

---

## Slice 3: Integrate Adapters into Chart Usage

### Deliverables

1. Wire adapters into chart demos/usages (or data prep paths) so charts consume normalized objects.
2. Keep rendering components focused on display concerns.
3. Add minimal compatibility wrappers where needed so existing chart props remain stable.

### Exit criteria

- Charts render correctly from adapter outputs.
- No chart component depends on raw CubeJS response shape directly.

---

## Slice 4: Testing Infrastructure and Coverage Config

### Deliverables

1. Configure coverage in `packages/ui/vitest.config.ts`.
2. Add coverage thresholds and reporting.
3. Add `packages/ui` test scripts/gates if needed (keep `test` and add coverage script if useful).
4. Decide baseline thresholds (recommended initial):
   - statements/functions/lines: 80%
   - branches: 70%

### Exit criteria

- Coverage runs in CI/local with deterministic output.
- Threshold failures prevent silent regressions.

---

## Slice 5: Test Priority 1 (Forms + lib)

### Deliverables

1. Unit tests for `packages/ui/lib` adapters:
   - happy paths
   - missing/null values
   - mixed numeric/string values
   - sorting and grouping edge cases
2. Form component tests (high confidence behavior):
   - value binding
   - validation wiring
   - disabled/error states
   - accessibility basics (labels/roles)

### Exit criteria

- `lib` adapter logic has strong branch coverage.
- forms are covered as first-class behavioral components.

---

## Slice 6: Test Priority 2 (Charts)

### Deliverables

1. Render + behavior tests for charts using normalized adapter outputs.
2. Verify chart-specific assumptions:
   - empty state
   - loading state
   - multi-series rendering
   - tooltip/legend visibility where applicable
3. Avoid brittle snapshots except for stable, high-signal cases.

### Exit criteria

- Charts are validated against adapter output contracts.
- Regressions in rendering/state behavior are caught.

---

## Slice 7: Test Priority 3 (Remaining Primitives)

### Deliverables

1. Add tests for remaining UI primitives:
   - smoke render tests for exported components
   - key interaction tests where behavior exists (dialogs, dropdowns, tabs, etc.)
2. Accessibility pass for keyboard/focus behavior in interactive primitives.

### Exit criteria

- Remaining primitives have baseline confidence coverage.
- Critical interaction regressions are protected.

---

## Slice 8: CI + Governance

### Deliverables

1. Add UI test + coverage to CI gates.
2. Require adapter test updates for any new chart data shape.
3. Document contribution rules:
   - new lib adapter => tests required
   - chart API changes => update adapter contract tests
   - form behavior changes => update interaction tests

### Exit criteria

- UI package has enforceable quality gates.
- Adapter + chart + form changes are consistently test-backed.

---

## Recommended Execution Order

1. Slice 1
2. Slice 4
3. Slice 2
4. Slice 5
5. Slice 3
6. Slice 6
7. Slice 7
8. Slice 8

This keeps architecture and test guardrails in place early, then fills in features and coverage in the order: `forms + lib` first, `charts` second, `remaining primitives` third.
