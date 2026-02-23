# Manifest Runner Plan

## Status

Updated on February 23, 2026.

Implemented:

- Slice B complete in `automations/scripts/create-block.mjs`:
  - required option validation from manifest metadata
  - unknown flag/type validation with explicit errors
  - malformed manifest schema checks
  - `--dry-run` command resolution mode
- Slice C complete via `automations/scripts/create-workflow.mjs` + `automations/workflows/examples.json`:
  - workflow manifests for multi-step scaffolds
  - dependency-ordered execution between block steps
  - shared variable interpolation (`{{var}}`) across steps
- Coverage updates:
  - `automations/tests/test/e2e/create-block.smoke.test.js`
  - `automations/tests/test/e2e/create-workflow.smoke.test.js`
  - `automations/tests/test/governance/workflows.test.js`

## Why this exists

The manifest runner is the semantic entrypoint for code generation in this repo.

Instead of calling individual generator files directly, we route generation through a single root command:

```bash
pnpm create:block -- --block <name> [flags...]
```

This keeps app/module scaffolding consistent and makes automation easier for both humans and AI agents.

---

## Current implementation

Primary file:

- `automations/scripts/create-block.mjs`

Manifest source:

- `automations/manifests/*.json`

Each manifest defines:

- `name`: block id (`next-app`, `nest-app`, `api-updator`, etc.)
- `entry`: command to run (typically a generator script)
- `description`: short purpose statement
- `options`: documented flags and defaults
- `outputs`: expected file targets

Runner behavior today:

1. Parses CLI args (`--block`, `--list`, `--help`)
2. Loads all manifest JSON files
3. Resolves the requested block by manifest `name` or filename
4. Executes the manifest `entry` with passthrough flags
5. Streams output directly for transparent debugging

Existing root-level generator scripts still exist (`create:next-app`, `create:nest-app`, etc.), but `create:block` is now the intended default interface.

---

## How we want to use it

### Default workflow (repo root)

```bash
pnpm create:block -- --list
pnpm create:block -- --block next-app --name admin --port 3002
pnpm create:block -- --block nest-app --name api --port 3001
pnpm create:block -- --block api-updator --app api --all
```

### Example orchestration

- `pnpm gen:examples` uses the manifest runner internally to chain multiple blocks.

### Team rules

1. Prefer `create:block` over direct `node automations/generators/...` calls.
2. Every new generator should have a matching manifest entry.
3. Manifest options should be the source of truth for docs.
4. If a generator introduces new flags, update:
   - the generator
   - its manifest
   - usage docs/examples

---

## Roadmap

### Slice A: Stabilize interface

1. Treat `create:block` as the official public API.
2. Keep existing direct scripts as compatibility aliases.
3. Add command docs that map block names to example invocations.

### Slice B: Validation and safety

1. Validate required manifest options before executing.
2. Add better errors for unknown flags and malformed manifests.
3. Add `--dry-run` support to print resolved command without writing files.

### Slice C: Composition

1. Add a `create:workflow` runner for manifest sequences (multi-step scaffolds).
2. Support dependency ordering between blocks.
3. Allow shared variables across steps (e.g., app name, port).

### Slice D: Testability

1. Add tests for:
   - manifest loading
   - block resolution
   - arg passthrough
   - error paths
2. Add smoke tests for key blocks in a disposable temp app directory.

### Slice E: Governance

1. Add a manifest schema and lint script.
2. Enforce manifest/docs sync in CI.
3. Add changelog entries for manifest-breaking changes.

---

## End-state vision

`create:block` becomes the single, stable automation surface for this template repo.

Generators become implementation details behind manifest contracts, which gives us:

- consistent scaffolding behavior
- easier AI agent orchestration
- safer evolution of internal generators without changing consumer workflows
