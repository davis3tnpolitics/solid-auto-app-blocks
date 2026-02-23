# Contributing

## Automation Changes

Generator behavior is contract-tested. Any generator, manifest, or workflow change should include matching tests in `automations/tests`.

Run locally:

```bash
pnpm test:automations
```

## Snapshot Policy

Use snapshots only for high-signal generator contract files.

Update snapshots intentionally:

```bash
pnpm test:automations:update
```

If snapshot output changes, include a short note in the PR explaining whether the change is expected and contract-safe.

## Contract-Breaking Changes

Treat these as contract-breaking and document them clearly:

- changed generated file paths
- removed generated routes/DTOs/modules
- changed manifest names/entries/options semantics
- changed default generator flags that alter output shape

## UI Adapter and Chart Rules

`packages/ui` now has coverage-gated adapter/chart/form tests.

Run locally:

```bash
pnpm test:ui
```

Required when changing UI data contracts:

- new adapter in `packages/ui/lib/cubejs-adapters.ts` must include unit tests for happy path and edge cases
- chart prop/data-shape changes must update chart tests in `packages/ui/components/charts/charts.test.tsx`
- form behavior changes must update interaction/validation tests in `packages/ui/components/forms/fields.test.tsx`
