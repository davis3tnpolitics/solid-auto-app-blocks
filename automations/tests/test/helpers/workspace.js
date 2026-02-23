const fs = require("fs");
const os = require("os");
const path = require("path");

const repoRoot = path.resolve(__dirname, "../../../..");
const manifestsSourceDir = path.join(repoRoot, "automations", "manifests");
const workflowsSourceDir = path.join(repoRoot, "automations", "workflows");

function createTempWorkspace(prefix = "automations-tests-") {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  scaffoldWorkspace(root);
  return root;
}

function removeTempWorkspace(root) {
  fs.rmSync(root, { recursive: true, force: true });
}

function scaffoldWorkspace(root) {
  fs.mkdirSync(path.join(root, "apps"), { recursive: true });
  fs.mkdirSync(path.join(root, "packages"), { recursive: true });

  copyDirectory(manifestsSourceDir, path.join(root, "automations", "manifests"));
  if (fs.existsSync(workflowsSourceDir)) {
    copyDirectory(workflowsSourceDir, path.join(root, "automations", "workflows"));
  }

  createPackageStub(root, "config", "config");
  createPackageStub(root, "auth", "auth");
  createPackageStub(root, "communications", "communications");
  createPackageStub(root, "database", "database");
  createPackageStub(root, "cube-helpers", "cube-helpers");
  createPackageStub(root, "nest-helpers", "nest-helpers");
  createPackageStub(root, "ui", "@workspace/ui");

  scaffoldPrismaFixture(root);
}

function scaffoldPrismaFixture(root) {
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

function createPackageStub(root, directory, packageName) {
  writeJson(root, `packages/${directory}/package.json`, {
    name: packageName,
    version: "0.0.0",
    private: true,
  });
}

function writeJson(root, relativePath, value) {
  writeFile(root, relativePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeFile(root, relativePath, content) {
  const targetPath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, content, "utf8");
}

function readFile(root, relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function fileExists(root, relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function copyDirectory(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.cpSync(from, to, { recursive: true });
}

module.exports = {
  repoRoot,
  createTempWorkspace,
  removeTempWorkspace,
  scaffoldWorkspace,
  writeFile,
  writeJson,
  readFile,
  fileExists,
};
