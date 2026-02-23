# Changelog

All notable changes to this repository are documented in this file.

## [Unreleased]

### Added

- Root DX scripts for workspace development/validation: `dev`, `build`, `lint`, `verify`.
- Automation governance lint script: `pnpm lint:automation-contracts`.
- `github-workflow-app` generator block to scaffold app CI workflows under `.github/workflows`.
- Default app CI workflow generation in `next-app` and `nest-app` generators.
- Expanded repo-infrastructure CI gates (governance, lint, typecheck, automations tests, UI tests).

### Changed

- `gen:examples` and generator docs now align with workflow-first CI behavior for generated apps.
