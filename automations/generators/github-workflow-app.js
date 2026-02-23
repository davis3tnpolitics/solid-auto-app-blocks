#!/usr/bin/env node
const path = require("path");
const { repoRoot, parseCliFlags, writeFileSafe } = require("./_shared/utils");

function normalizeWorkflowSlug(input) {
  return String(input)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getFrameworkLabel(framework) {
  const value = String(framework || "").toLowerCase();
  if (value === "next" || value === "nextjs") return "Next.js";
  if (value === "nest" || value === "nestjs") return "NestJS";
  return "App";
}

function createWorkflowContent({ appName, workflowSlug, framework }) {
  const frameworkLabel = getFrameworkLabel(framework);
  const githubRefExpr = "${{ github.ref }}";
  const githubShaExpr = "${{ github.sha }}";
  const alwaysFalseExpr = "${{ false }}";

  return `name: App CI (${appName})

on:
  pull_request:
    paths:
      - "apps/${appName}/**"
      - "packages/**"
      - "pnpm-lock.yaml"
      - "pnpm-workspace.yaml"
      - "package.json"
      - ".github/workflows/app-${workflowSlug}-ci.yml"
  push:
    branches:
      - main
    paths:
      - "apps/${appName}/**"
      - "packages/**"
      - "pnpm-lock.yaml"
      - "pnpm-workspace.yaml"
      - "package.json"
      - ".github/workflows/app-${workflowSlug}-ci.yml"
  workflow_dispatch:

concurrency:
  group: app-${workflowSlug}-ci-${githubRefExpr}
  cancel-in-progress: true

permissions:
  contents: read

jobs:
  app-ci:
    name: ${frameworkLabel} App CI
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup PNPM
        uses: pnpm/action-setup@v4
        with:
          version: 10.28.0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run lint (if defined)
        run: |
          if node -e "const pkg=require('./apps/${appName}/package.json'); process.exit(pkg.scripts && pkg.scripts.lint ? 0 : 1)"; then
            pnpm --filter ${appName} lint
          else
            echo "Skipping lint: no script in apps/${appName}/package.json"
          fi

      - name: Run typecheck (if defined)
        run: |
          if node -e "const pkg=require('./apps/${appName}/package.json'); process.exit(pkg.scripts && pkg.scripts.typecheck ? 0 : 1)"; then
            pnpm --filter ${appName} typecheck
          else
            echo "Skipping typecheck: no script in apps/${appName}/package.json"
          fi

      - name: Run tests (if defined)
        run: |
          if node -e "const pkg=require('./apps/${appName}/package.json'); process.exit(pkg.scripts && pkg.scripts.test ? 0 : 1)"; then
            pnpm --filter ${appName} test
          else
            echo "Skipping tests: no script in apps/${appName}/package.json"
          fi

      - name: Run build (if defined)
        run: |
          if node -e "const pkg=require('./apps/${appName}/package.json'); process.exit(pkg.scripts && pkg.scripts.build ? 0 : 1)"; then
            pnpm --filter ${appName} build
          else
            echo "Skipping build: no script in apps/${appName}/package.json"
          fi

  deploy-placeholder:
    name: Deploy Placeholder
    runs-on: ubuntu-latest
    needs: [app-ci]
    if: ${alwaysFalseExpr}

    steps:
      - name: Deploy hook placeholder
        run: echo "Configure deploy hooks for apps/${appName} at commit ${githubShaExpr}."
`;
}

function generateAppWorkflow({ appName, framework = "app", force = false }) {
  if (!appName) {
    throw new Error('Provide an app name with "--app <appName>".');
  }

  const workflowSlug = normalizeWorkflowSlug(appName);
  if (!workflowSlug) {
    throw new Error(`Could not derive workflow name from app "${appName}".`);
  }

  const targetPath = path.join(repoRoot, ".github", "workflows", `app-${workflowSlug}-ci.yml`);
  const content = createWorkflowContent({ appName, workflowSlug, framework });
  writeFileSafe(targetPath, content, { force: Boolean(force) });

  return {
    targetPath,
    workflowSlug,
  };
}

function main() {
  try {
    const flags = parseCliFlags({ force: false, framework: "app" });
    const appName = flags.app || flags.name || flags.appName;

    const result = generateAppWorkflow({
      appName,
      framework: flags.framework,
      force: flags.force,
    });

    console.log(
      `[github-workflow-app] Created workflow at ${path.relative(repoRoot, result.targetPath)}`
    );
  } catch (error) {
    console.error(`[github-workflow-app] ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  main,
  generateAppWorkflow,
  createWorkflowContent,
  normalizeWorkflowSlug,
};
