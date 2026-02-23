# DX + CI Plan

## Status

Drafted on February 23, 2026.

## Goal

Improve local developer experience and CI reliability so contributors can run one predictable workflow locally and get fast, enforceable feedback in pull requests.

## Scope

1. Standardize root-level developer scripts and usage patterns.
2. Expand CI from basic test execution into explicit quality gates.
3. Add governance checks for automation manifests/workflows and docs sync.
4. Keep CI runtime reasonable with caching and targeted execution.

## Non-Goals

1. Replacing current generator architecture.
2. Migrating to a different CI provider.
3. Rewriting app/package test stacks.

---

## Slice 1: Root DX Baseline

### Deliverables

1. Add root scripts in `package.json`:
   - `dev`
   - `build`
   - `lint`
   - `verify` (aggregates lint + typecheck + tests)
2. Ensure each workspace package/app has consistent `lint`/`typecheck` entries (or is intentionally excluded).
3. Document “daily driver” commands in `README.md` and `CONTRIBUTING.md`.

### Exit Criteria

1. New contributors can run one command to validate the workspace (`pnpm verify`).
2. Root script list is consistent with documented workflow.

---

## Slice 2: CI Job Architecture

### Deliverables

1. Split CI into explicit jobs:
   - automations tests
   - UI tests + coverage
   - workspace typecheck
   - lint
2. Add CI concurrency cancellation for duplicate branch runs.
3. Keep deterministic install path (`pnpm install --frozen-lockfile`) with PNPM cache reuse.

### Exit Criteria

1. PR checks clearly show which quality gate failed.
2. CI remains reproducible across local and GitHub runners.

---

## Slice 3: Automation Governance Gates

### Deliverables

1. Add a dedicated governance script (for example `pnpm lint:automation-contracts`) that validates:
   - manifest schema conventions
   - workflow schema conventions
   - entry path validity
2. Add docs sync checks when manifests/workflows change:
   - command docs present in `README.md`
   - contribution/testing expectations present in `CONTRIBUTING.md`
3. Add a changelog/changeset policy for manifest/workflow contract changes.

### Exit Criteria

1. Contract changes cannot merge without matching governance updates.
2. Manifest/workflow behavior and docs remain aligned.

---

## Slice 4: App CI Workflow Generator

### Deliverables

1. Add a generator block (for example `github-workflow-app`) that can scaffold app CI workflows in `.github/workflows`.
2. Define a standard app workflow template contract:
   - install + cache setup
   - app-scoped lint/typecheck/test/build jobs (when scripts exist)
   - optional deploy placeholder job (disabled by default)
3. Integrate workflow generation into app generators (`next-app`, `nest-app`) behind flags:
   - default on for new apps
   - opt-out flag for local experimentation
4. Keep a separate, stable repo-infra workflow for semantic-layer quality gates:
   - automations tests
   - manifest/workflow governance checks
   - workspace typecheck and shared package checks
5. Add conventions for workflow naming and ownership:
   - `app-<name>-ci.yml` for generated app workflows
   - clear boundaries between repo-infra workflow and app workflows

### Exit Criteria

1. Creating a new app can automatically create a matching CI workflow.
2. Repo-infra CI remains stable even as per-app workflows are added.
3. Generated app workflows are contract-tested and documented.

---

## Slice 5: CI Performance and Signal

### Deliverables

1. Introduce path-aware execution strategy:
   - run full CI on `main`
   - run targeted jobs for PRs when safe
2. Publish useful artifacts:
   - UI coverage summary
   - generator snapshot diffs when changed
3. Add runtime budget targets and track median CI duration.

### Exit Criteria

1. PR feedback is fast enough for regular iteration.
2. CI still catches cross-cutting regressions before merge.

---

## Slice 6: Local Developer Ergonomics

### Deliverables

1. Add optional pre-push hook guidance:
   - run `pnpm typecheck`
   - run affected tests
2. Add a short “troubleshooting CI locally” section in docs.
3. Add script discoverability:
   - grouped command table in `README.md`
   - “when to run what” in `CONTRIBUTING.md`

### Exit Criteria

1. Fewer “works on my machine” failures.
2. Contributors can reproduce CI checks locally without guesswork.

---

## Slice 7: Rollout and Enforcement

### Deliverables

1. Roll out in two stages:
   - Stage 1: additive checks in warning mode
   - Stage 2: promote to required PR checks
2. Update branch protection to require final gate set.
3. Add owner/reviewer guidance for automation-contract changes.

### Exit Criteria

1. New gates are enforced without blocking migration.
2. Required checks represent the repo’s real quality contract.

---

## Recommended Execution Order

1. Slice 1
2. Slice 2
3. Slice 3
4. Slice 4
5. Slice 5
6. Slice 6
7. Slice 7

This order establishes a stable local workflow first, then aligns CI gates, and finally tightens governance/enforcement.
