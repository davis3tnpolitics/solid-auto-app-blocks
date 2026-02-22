# Generator Test Plan

## Goal

Add a reliable test harness for automation generators so template behavior stays stable as we evolve manifests, generators, and scripts.

Testing strategy is split into slices so we can ship value quickly and tighten confidence over time.

---

## Slice 1: Test Harness Foundation

### Deliverables

1. Create `automations/tests/` structure.
2. Add a dedicated test runner config for automations (Vitest).
3. Add helper utilities for:
   - creating temp workspaces
   - copying minimal fixtures
   - running generator commands
   - reading generated files
4. Add root script(s):
   - `test:automations`

### Exit criteria

- `pnpm test:automations` runs successfully.
- Harness can execute a command and assert file existence in a temp workspace.

---

## Slice 2: Unit Tests for Generator Logic

### Deliverables

1. Extract/cover pure logic paths where practical:
   - Prisma model discovery (`--all`)
   - model/resource naming/pluralization behavior
   - search type inference for fields
   - pagination defaults parsing behavior
2. Add tests for guard behavior:
   - no-auto-update directive detection
   - force vs non-force write behavior

### Exit criteria

- Unit suite runs fast and deterministically.
- Known edge cases are covered with explicit assertions.

---

## Slice 3: Snapshot / Contract Tests

### Deliverables

1. Generate output into temp dirs and snapshot critical files:
   - `next-app` core files
   - `nest-app` core files
   - `api-updator` DTO/service/controller/module outputs
2. Snapshot only high-signal files (avoid over-snapshotting).
3. Add intentional update workflow for snapshots.

### Exit criteria

- Snapshot diffs clearly show generator output regressions.
- Template contract files are under test.

---

## Slice 4: End-to-End Smoke Tests (CLI Reality)

### Deliverables

1. Smoke tests for root commands:
   - `pnpm create:block -- --list`
   - `pnpm create:block -- --block next-app ...`
   - `pnpm create:block -- --block nest-app ...`
   - `pnpm create:block -- --block api-updator --model User --skip-db-generate`
2. Assertions for generated behavior:
   - `/search` route exists by default
   - `--search false` omits search artifacts
   - `--all` reads Prisma schema model names
   - pagination response contract present in controller/service

### Exit criteria

- Core user workflows pass in isolated temp workspaces.
- Failures are actionable and tied to specific generator paths.

---

## Slice 5: CI Integration

### Deliverables

1. Add GitHub Actions workflow for automations tests.
2. Gate PRs on:
   - `test:automations`
   - (optionally) lint/typecheck for automations scripts
3. Ensure predictable CI setup with required env defaults for smoke tests.

### Exit criteria

- PRs fail on generator regressions before merge.
- CI runtime remains reasonable.

---

## Slice 6: Hardening and Maintenance

### Deliverables

1. Add manifest schema validation test:
   - every manifest has required keys
   - `entry` points to an existing script
2. Add regression tests for previously fixed bugs (e.g., bad passthrough `--` handling).
3. Document testing conventions in README/CONTRIBUTING:
   - when to add tests
   - snapshot update policy
   - what qualifies as a contract-breaking generator change

### Exit criteria

- Generator changes require matching test updates.
- Manifest + generator ecosystem has long-term guardrails.

---

## Recommended Order

1. Slice 1
2. Slice 4 (minimal smoke path early)
3. Slice 2
4. Slice 3
5. Slice 5
6. Slice 6

This order gives immediate confidence in real commands while still building out deep coverage incrementally.
