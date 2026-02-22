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
