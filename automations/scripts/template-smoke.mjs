#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = process.env.SOLID_AUTO_APP_BLOCKS_REPO_ROOT
  ? path.resolve(process.env.SOLID_AUTO_APP_BLOCKS_REPO_ROOT)
  : path.resolve(__dirname, "../..");

function copyDirectory(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.cpSync(from, to, { recursive: true });
}

function writeFile(root, relativePath, content) {
  const filePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function writeJson(root, relativePath, value) {
  writeFile(root, relativePath, `${JSON.stringify(value, null, 2)}\n`);
}

function createPackageStub(root, directory, packageName) {
  writeJson(root, `packages/${directory}/package.json`, {
    name: packageName,
    version: "0.0.0",
    private: true,
  });
}

function scaffoldWorkspace(root) {
  fs.mkdirSync(path.join(root, "apps"), { recursive: true });
  fs.mkdirSync(path.join(root, "packages"), { recursive: true });

  copyDirectory(
    path.join(repoRoot, "automations", "manifests"),
    path.join(root, "automations", "manifests")
  );
  copyDirectory(
    path.join(repoRoot, "automations", "workflows"),
    path.join(root, "automations", "workflows")
  );

  createPackageStub(root, "config", "config");
  createPackageStub(root, "auth", "auth");
  createPackageStub(root, "database", "database");
  createPackageStub(root, "cube-helpers", "cube-helpers");
  createPackageStub(root, "nest-helpers", "nest-helpers");
  createPackageStub(root, "dev-ops", "dev-ops");
  createPackageStub(root, "ui", "@workspace/ui");

  writeFile(
    root,
    "packages/database/prisma/schema.prisma",
    `datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String
  name      String?
  age       Int?
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
}
`
  );

  writeFile(
    root,
    "packages/database/client/prisma/models/User.ts",
    `export type UserUncheckedCreateInput = {
  id?: string;
  email: string;
  name?: string | null;
  age?: number;
  isActive?: boolean;
  createdAt?: Date | string;
};
`
  );

  writeFile(
    root,
    "packages/database/contracts/models/User.model.ts",
    `export class User {
  id!: string;
  email!: string;
  name?: string | null;
  age?: number;
  isActive?: boolean;
  createdAt!: Date;
}
`
  );
}

function ensureTypeScriptRuntime(root) {
  const candidates = [
    path.join(repoRoot, "node_modules", "typescript"),
    path.join(repoRoot, "packages", "config", "node_modules", "typescript"),
    path.join(repoRoot, "packages", "database", "node_modules", "typescript"),
    path.join(repoRoot, "packages", "ui", "node_modules", "typescript"),
  ];

  const resolved = candidates.find((candidate) => fs.existsSync(candidate));
  if (!resolved) {
    throw new Error(
      "Template smoke could not locate a TypeScript runtime in this workspace."
    );
  }

  const destination = path.join(
    root,
    "packages",
    "config",
    "node_modules",
    "typescript"
  );
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.cpSync(resolved, destination, { recursive: true, dereference: true });
}

function runNodeScript(scriptPath, args, workspaceRoot) {
  execFileSync(process.execPath, [scriptPath, ...args], {
    cwd: repoRoot,
    stdio: "inherit",
    env: {
      ...process.env,
      SOLID_AUTO_APP_BLOCKS_REPO_ROOT: workspaceRoot,
      SOLID_AUTO_APP_BLOCKS_SCRIPT_ROOT: repoRoot,
    },
  });
}

function assertPathExists(workspaceRoot, relativePath) {
  const absolutePath = path.join(workspaceRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Expected output was not generated: ${relativePath}`);
  }
}

function main() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "template-smoke-"));

  try {
    scaffoldWorkspace(tempRoot);
    ensureTypeScriptRuntime(tempRoot);

    runNodeScript(
      path.join(repoRoot, "automations", "scripts", "create-workflow.mjs"),
      [
        "--workflow",
        "examples",
        "--web",
        "template-web",
        "--api",
        "template-api",
        "--model",
        "User",
        "--skip-db-generate",
        "true",
        "--force",
        "true",
      ],
      tempRoot
    );

    runNodeScript(
      path.join(repoRoot, "automations", "scripts", "create-block.mjs"),
      [
        "--block",
        "next-compose-page",
        "--app",
        "template-web",
        "--preset",
        "dashboard-basic",
        "--model",
        "User",
        "--route",
        "dashboard",
        "--analytics-app",
        "template-api",
      ],
      tempRoot
    );

    assertPathExists(tempRoot, "apps/template-web/package.json");
    assertPathExists(tempRoot, "apps/template-api/src/main.ts");
    assertPathExists(tempRoot, "apps/template-api/src/users/users.controller.ts");
    assertPathExists(tempRoot, "apps/template-api/src/analytics/contracts/user.analytics.ts");
    assertPathExists(tempRoot, "apps/template-web/src/app/analytics/users/page.tsx");
    assertPathExists(tempRoot, "apps/template-web/src/app/dashboard/page.tsx");

    console.log("[template-smoke] OK: workflow + composed page generation succeeded.");
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

main();
