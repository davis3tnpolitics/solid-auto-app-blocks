# Next App CRUD Hooks + Page Templates Plan

## Status

Drafted on February 23, 2026.

## Goal

Significantly extend Next app generation so data models can get end-to-end frontend scaffolding:

1. TanStack Query + Axios CRUD hooks per model.
2. Page templates for list/detail/create/edit routes:
   - `/{data_type}` (pluralized)
   - `/{data_type}/:id`
   - `/{data_type}/create`
   - `/{data_type}/:id/edit`

## Scope

1. Add generator support for frontend data modules per model.
2. Generate reusable CRUD hooks using Axios + TanStack Query.
3. Generate route/page templates for list/detail/create/edit.
4. Keep generated code typed, composable, and reusable across Next apps.
5. Expose generation through manifest-first semantic-layer contracts (`create:block`), not one-off scripts.

## Non-Goals

1. Defining final product UI design system for every app.
2. Building backend business logic in this plan.
3. Replacing manual custom pages where teams need bespoke behavior.

---

## Slice 1: Hook Infrastructure Baseline

### Deliverables

1. Add a manifest-backed block for this feature set (for example `next-crud-pages`) as the public interface:
   - generator entry in `automations/manifests/*.json`
   - documented options/defaults/outputs as contract source of truth
2. Add shared client scaffolding for generated hooks:
   - Axios instance (`baseURL`, interceptors, error handling hooks)
   - query key conventions
   - typed API response wrappers
3. Define model metadata source (Prisma/contracts/openapi) used to generate hook types.

### Exit Criteria

1. A model can resolve to a stable client-side type contract.
2. Generated hooks share one consistent query-key and axios strategy.
3. Generator behavior is invokable through `pnpm create:block -- --block <name> ...`.

---

## Slice 2: CRUD Hook Generation

### Deliverables

1. Generate per-model hooks:
   - `use<Models>()` list query
   - `use<Model>(id)` detail query
   - `useCreate<Model>()` mutation
   - `useUpdate<Model>()` mutation
   - `useDelete<Model>()` mutation
2. Generate query key helpers:
   - `all`
   - `lists`
   - `list(params)`
   - `detail(id)`
3. Add invalidation/update strategy defaults for successful mutations.
4. Add generator flags:
   - `--model` / `--models` / `--all`
   - `--app`
   - `--force`

### Exit Criteria

1. Generated hooks support complete CRUD behavior for selected models.
2. Mutation flows correctly invalidate/refetch list/detail queries.

---

## Slice 3: Page Template Generation + Reusable CRUD UI Components

### Deliverables

1. Generate route structure per model:
   - `src/app/{plural}/page.tsx`
   - `src/app/{plural}/[id]/page.tsx`
   - `src/app/{plural}/create/page.tsx`
   - `src/app/{plural}/[id]/edit/page.tsx`
2. Add generalizable CRUD primitives to `packages/ui` for generator reuse:
   - `CrudList` (list shell with loading/empty/error states)
   - `CrudTable` (column-driven table for list pages)
   - `CrudDetail` (read-only detail layout with key/value sections)
   - `CrudForm` (schema/field-config driven form for create/edit pages)
3. Wire generated templates to hooks and the new CRUD primitives:
   - list table + loading/empty/error states
   - detail view + loading/error states
   - create/edit forms with submit/cancel
4. Include safe defaults for navigation and optimistic UX patterns.
5. Ensure generated edit pages use drop-in `CrudForm` by default (not bespoke page-local form markup).
6. Add design customization options as semantic-layer inputs (manifest flags), for example:
   - `--ui-preset` (`default`, `compact`, `spacious`)
   - `--layout` (`table`, `cards`, `split-detail`)
   - `--form-style` (`stacked`, `two-column`)
   - `--theme-token-file` (optional app-level token mapping)

### Exit Criteria

1. Generated routes are runnable immediately after generation.
2. Hooks/pages are connected with minimal manual wiring.
3. List/detail/table/form UI is reusable across generated models/apps via `packages/ui`.
4. Basic visual/layout customization is possible without editing generator internals.

---

## Slice 4: Form and Validation Integration

### Deliverables

1. Generate model form schemas and field mappings (prefer shared contracts).
2. Extend `CrudForm` to support model-driven field configs and validation wiring.
3. Provide override points for:
   - hidden/readonly fields
   - custom field widgets
   - model-specific validation rules

### Exit Criteria

1. Create/edit pages submit valid payloads with typed form data.
2. Teams can customize field behavior without rewriting generated pages.

---

## Slice 5: Testing and Contract Coverage

### Deliverables

1. Unit tests for hook generation logic:
   - naming and path generation
   - query key contracts
   - mutation invalidation behavior
2. Snapshot tests for generated files:
   - hooks
   - list/detail/create/edit pages
3. E2E smoke generation test:
   - generate Next app + model hooks/pages
   - assert expected route files and imports exist

### Exit Criteria

1. Hook/page generation regressions are caught in CI.
2. Generated contracts are stable and intentional.

---

## Slice 6: CI, Governance, and Docs

### Deliverables

1. Add generator tests to automations CI gates.
2. Add docs for usage:
   - command examples for model selection
   - command examples for customization flags (`--ui-preset`, `--layout`, `--form-style`)
   - generated file map
   - extension/customization points
3. Add governance policy:
   - route contract changes require test updates
   - hook API changes require changelog entry
   - manifest option changes require docs + contract test updates

### Exit Criteria

1. Frontend scaffolding contracts are documented and enforceable.
2. Teams can adopt generated hooks/pages consistently across apps.

---

## Recommended Execution Order

1. Slice 1
2. Slice 2
3. Slice 3
4. Slice 5
5. Slice 4
6. Slice 6

This order ships useful model CRUD scaffolding early, then hardens quality before deeper customization support.
