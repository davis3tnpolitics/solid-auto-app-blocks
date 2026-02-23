#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const {
  repoRoot,
  parseCliFlags,
  writeFileSafe,
  formatJson,
  readWorkspacePackages,
} = require("./_shared/utils");
const { generateAppWorkflow } = require("./github-workflow-app");

const DEFAULT_CUBE_SERVER_VERSION = "^1.6.14";
const DEFAULT_CLI_TIMEOUT_MS = 45000;

function main() {
  try {
    const flags = parseCliFlags({
      port: 4000,
      dbType: "postgres",
      template: "docker",
      force: false,
      install: true,
      cubeCli: true,
      cubeCliTimeoutMs: DEFAULT_CLI_TIMEOUT_MS,
      ciWorkflow: true,
    });
    const appName = flags.name || flags.app || flags.appName;
    const targetDir = path.join(repoRoot, "apps", String(appName || ""));
    const shouldInstall = flags.install !== false && flags.skipInstall !== true;
    const shouldUseCubeCli = flags.cubeCli !== false && flags.skipCubeCli !== true;
    const shouldGenerateCiWorkflow =
      flags.ciWorkflow !== false && flags.skipCiWorkflow !== true;

    if (!appName) {
      throw new Error('Provide an app name with "--name <appName>".');
    }

    if (fs.existsSync(targetDir) && !flags.force) {
      throw new Error(
        `App directory already exists at ${targetDir}. Use --force to overwrite.`
      );
    }

    const packages = readWorkspacePackages();
    const workspaceDeps = selectWorkspaceDeps(packages);
    const targetExistsBefore = fs.existsSync(targetDir);

    let createdViaCubeCli = false;
    if (shouldUseCubeCli) {
      createdViaCubeCli = tryCreateWithCubeCli({
        appName,
        dbType: String(flags.dbType || "postgres"),
        template: normalizeCubeTemplate(flags.template),
        timeoutMs: Number(flags.cubeCliTimeoutMs) || DEFAULT_CLI_TIMEOUT_MS,
      });
    }

    if (createdViaCubeCli) {
      postConfigureCubeCliApp({
        appName,
        targetDir,
        workspaceDeps,
        port: Number(flags.port) || 4000,
        force: Boolean(flags.force),
      });
    } else {
      if (targetExistsBefore && !flags.force) {
        throw new Error(
          `Cube CLI bootstrap was not used and app directory exists at ${targetDir}. Use --force to overwrite with fallback templates.`
        );
      }
      scaffoldCubeAppTemplate({
        appName,
        targetDir,
        workspaceDeps,
        port: Number(flags.port) || 4000,
        force: Boolean(flags.force),
      });
    }

    if (shouldGenerateCiWorkflow) {
      generateAppWorkflow({
        appName,
        framework: "app",
        force: Boolean(flags.force),
      });
    }

    if (shouldInstall) {
      runWorkspaceInstall();
    }

    console.log(
      `[cube-app] Created Cube app at apps/${appName}${createdViaCubeCli ? " (Cube CLI)" : " (template fallback)"}`
    );
  } catch (error) {
    console.error(`[cube-app] ${error.message}`);
    process.exit(1);
  }
}

function normalizeCubeTemplate(input) {
  const value = String(input || "docker").toLowerCase();
  const supported = new Set(["docker", "express", "serverless", "serverless-google"]);
  if (!supported.has(value)) {
    throw new Error(
      `Unsupported Cube template "${input}". Use one of: docker, express, serverless, serverless-google.`
    );
  }
  return value;
}

function tryCreateWithCubeCli({ appName, dbType, template, timeoutMs }) {
  const appsDir = path.join(repoRoot, "apps");
  fs.mkdirSync(appsDir, { recursive: true });

  const command = `pnpm dlx cubejs-cli create ${JSON.stringify(
    appName
  )} -d ${JSON.stringify(dbType)} -t ${JSON.stringify(template)}`;

  try {
    execSync(command, {
      cwd: appsDir,
      stdio: "pipe",
      timeout: timeoutMs,
      env: {
        ...process.env,
        CI: "1",
        NO_UPDATE_NOTIFIER: "1",
      },
    });
    return true;
  } catch (error) {
    const reason = error && error.message ? error.message : "unknown error";
    console.warn(
      `[cube-app] Cube CLI bootstrap failed (${reason}). Falling back to workspace template.`
    );
    return false;
  }
}

function selectWorkspaceDeps(packages) {
  const preferred = new Set(["database", "cube-helpers", "config"]);
  return packages.filter((pkg) => preferred.has(pkg.name));
}

function postConfigureCubeCliApp({ appName, targetDir, workspaceDeps, port, force }) {
  const packageJsonPath = path.join(targetDir, "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error(
      `Cube CLI finished but package.json was not found at ${path.relative(repoRoot, packageJsonPath)}.`
    );
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  packageJson.private = true;
  packageJson.name = appName;
  packageJson.version = packageJson.version || "0.1.0";

  const scripts = packageJson.scripts || {};
  scripts.dev = scripts.dev || "cubejs-server";
  scripts.start = scripts.start || "cubejs-server";
  scripts.build = scripts.build || "echo \"Cube app is runtime-first; no build output.\"";
  scripts.lint = scripts.lint || "echo \"No lint configured for cube app\"";
  scripts.typecheck = scripts.typecheck || "tsc --noEmit";
  packageJson.scripts = scripts;

  packageJson.dependencies = packageJson.dependencies || {};
  packageJson.dependencies["@cubejs-backend/server"] =
    packageJson.dependencies["@cubejs-backend/server"] || DEFAULT_CUBE_SERVER_VERSION;

  workspaceDeps.forEach((pkg) => {
    packageJson.dependencies[pkg.name] = "workspace:*";
  });

  packageJson.devDependencies = packageJson.devDependencies || {};
  packageJson.devDependencies.typescript = packageJson.devDependencies.typescript || "^5.9.3";
  packageJson.devDependencies["@types/node"] =
    packageJson.devDependencies["@types/node"] || "^20";

  packageJson.dependencies = Object.fromEntries(
    Object.entries(packageJson.dependencies).sort(([left], [right]) => left.localeCompare(right))
  );
  packageJson.devDependencies = Object.fromEntries(
    Object.entries(packageJson.devDependencies).sort(([left], [right]) =>
      left.localeCompare(right)
    )
  );

  fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");

  const fallbackFiles = createFallbackFiles({ appName, workspaceDeps, port });
  Object.entries(fallbackFiles).forEach(([relativePath, content]) => {
    const filePath = path.join(targetDir, relativePath);
    if (fs.existsSync(filePath) && !force) return;
    writeFileSafe(filePath, content, { force: true });
  });
}

function scaffoldCubeAppTemplate({ appName, targetDir, workspaceDeps, port, force }) {
  const files = createFallbackFiles({ appName, workspaceDeps, port });

  Object.entries(files).forEach(([relativePath, content]) => {
    writeFileSafe(path.join(targetDir, relativePath), content, { force });
  });
}

function createFallbackFiles({ appName, workspaceDeps, port }) {
  return {
    "package.json": createPackageJson(appName, workspaceDeps),
    "tsconfig.json": createTsConfig(workspaceDeps),
    ".gitignore": createGitignore(),
    ".env.example": createEnvExample(port),
    "cube.js": createCubeConfig(),
    "model/Health.js": createHealthCubeModel(),
    "README.md": createReadme(appName, port),
  };
}

function createPackageJson(appName, workspaceDeps) {
  const dependencyEntries = {
    "@cubejs-backend/server": DEFAULT_CUBE_SERVER_VERSION,
  };
  workspaceDeps.forEach((pkg) => {
    dependencyEntries[pkg.name] = "workspace:*";
  });

  const packageJson = {
    name: appName,
    version: "0.1.0",
    private: true,
    scripts: {
      dev: "cubejs-server",
      start: "cubejs-server",
      build: "echo \"Cube app is runtime-first; no build output.\"",
      lint: "echo \"No lint configured for cube app\"",
      typecheck: "tsc --noEmit",
    },
    dependencies: Object.fromEntries(
      Object.entries(dependencyEntries).sort(([left], [right]) => left.localeCompare(right))
    ),
    devDependencies: {
      typescript: "^5.9.3",
      "@types/node": "^20",
    },
    engines: {
      node: ">=20.9.0",
    },
  };

  return formatJson(packageJson);
}

function createTsConfig(workspaceDeps) {
  const paths = {};

  workspaceDeps.forEach((pkg) => {
    paths[pkg.name] = [`../../packages/${pkg.dir}/src/index.ts`, `../../packages/${pkg.dir}`];
    paths[`${pkg.name}/*`] = [`../../packages/${pkg.dir}/src/*`, `../../packages/${pkg.dir}/*`];
  });

  const tsconfig = {
    extends: "../../packages/config/tsconfig.base.json",
    compilerOptions: {
      target: "ES2021",
      module: "CommonJS",
      moduleResolution: "Node",
      strict: true,
      allowJs: true,
      noEmit: true,
      baseUrl: ".",
      paths,
      types: ["node"],
    },
    include: ["cube.js", "model/**/*.js", "src/**/*.ts"],
    exclude: ["node_modules", "dist"],
  };

  return formatJson(tsconfig);
}

function createGitignore() {
  return `node_modules
.env
.env.local
dist
`;
}

function createEnvExample(port) {
  return `CUBEJS_DEV_MODE=true
CUBEJS_PORT=${port}
CUBEJS_DB_TYPE=postgres
CUBEJS_DB_HOST=localhost
CUBEJS_DB_PORT=5432
CUBEJS_DB_NAME=app
CUBEJS_DB_USER=postgres
CUBEJS_DB_PASS=postgres
`;
}

function createCubeConfig() {
  return `module.exports = {
  // Use this file for shared driver/context configuration.
  // Schema files are generated under ./model by default.
};
`;
}

function createHealthCubeModel() {
  return `cube("Health", {
  sql: "SELECT 1 as id",

  measures: {
    count: {
      type: "count",
    },
  },

  dimensions: {
    id: {
      sql: "id",
      type: "number",
      primaryKey: true,
    },
  },
});
`;
}

function createReadme(appName, port) {
  return `# ${appName}

Generated by \`automations/generators/cube-app.js\`.

## Scripts

- \`pnpm --filter ${appName} dev\` runs Cube dev server
- \`pnpm --filter ${appName} start\` runs Cube server
- \`pnpm --filter ${appName} typecheck\` checks local TS/JS contract files

Default Cube port: \`${port}\`.
`;
}

function runWorkspaceInstall() {
  try {
    execSync("pnpm install", {
      cwd: repoRoot,
      stdio: "inherit",
    });
  } catch (error) {
    throw new Error(`Failed to run "pnpm install" after app creation (${error.message})`);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  main,
  normalizeCubeTemplate,
  selectWorkspaceDeps,
};
