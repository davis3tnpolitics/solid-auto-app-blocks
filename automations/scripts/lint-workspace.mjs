#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = process.env.SOLID_AUTO_APP_BLOCKS_REPO_ROOT
  ? path.resolve(process.env.SOLID_AUTO_APP_BLOCKS_REPO_ROOT)
  : path.resolve(__dirname, "../..");

const workspaceDirs = [path.join(repoRoot, "apps"), path.join(repoRoot, "packages")];

function readWorkspacePackages() {
  const packages = [];

  workspaceDirs.forEach((baseDir) => {
    if (!fs.existsSync(baseDir)) return;

    fs.readdirSync(baseDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .forEach((entry) => {
        const packageDir = path.join(baseDir, entry.name);
        const packageJsonPath = path.join(packageDir, "package.json");
        if (!fs.existsSync(packageJsonPath)) return;

        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
        packages.push({
          dir: packageDir,
          packageJson,
          packageJsonPath,
        });
      });
  });

  return packages.sort((a, b) => a.packageJson.name.localeCompare(b.packageJson.name));
}

function runLint(packageName) {
  const command = `pnpm --filter ${JSON.stringify(packageName)} lint`;
  console.log(`[lint:workspace] ${command}`);
  execSync(command, { cwd: repoRoot, stdio: "inherit" });
}

function main() {
  const workspacePackages = readWorkspacePackages();
  const skipped = [];

  workspacePackages.forEach(({ packageJson, packageJsonPath }) => {
    const packageName = packageJson.name;
    const lintScript = packageJson.scripts && packageJson.scripts.lint;

    if (!lintScript) return;

    if (packageName === "@workspace/ui") {
      skipped.push(`${packageName} (intentional skip until UI lint baseline is stabilized)`);
      return;
    }

    if (!packageName) {
      throw new Error(`Missing package name in ${path.relative(repoRoot, packageJsonPath)}.`);
    }

    runLint(packageName);
  });

  if (skipped.length > 0) {
    console.log("[lint:workspace] Skipped lint for:");
    skipped.forEach((entry) => {
      console.log(`- ${entry}`);
    });
  }

  console.log("[lint:workspace] Done.");
}

main();
