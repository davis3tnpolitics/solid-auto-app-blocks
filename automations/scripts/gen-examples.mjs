#!/usr/bin/env node
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = process.env.SOLID_AUTO_APP_BLOCKS_REPO_ROOT
  ? path.resolve(process.env.SOLID_AUTO_APP_BLOCKS_REPO_ROOT)
  : path.resolve(__dirname, "../..");

export function parseArgs(argv) {
  const defaults = {
    web: "example-web",
    api: "example-api",
    model: "User",
    webPort: 3100,
    apiPort: 3101,
    force: true,
    skipDbGenerate: false,
  };

  const args = { ...defaults };
  const tokens = argv.slice(2);

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (!token.startsWith("--")) continue;

    const [rawKey, rawInlineValue] = token.slice(2).split("=");
    const key = rawKey.replace(/-([a-z])/g, (_, char) => char.toUpperCase());

    let value = rawInlineValue;
    if (value === undefined && tokens[i + 1] && !tokens[i + 1].startsWith("--")) {
      value = tokens[i + 1];
      i += 1;
    }

    if (value === undefined) {
      args[key] = true;
      continue;
    }

    if (value === "true") args[key] = true;
    else if (value === "false") args[key] = false;
    else if (!Number.isNaN(Number(value)) && value.trim() !== "") args[key] = Number(value);
    else args[key] = value;
  }

  if (args.noForce === true) args.force = false;
  return args;
}

export function run(command) {
  console.log(`[gen:examples] ${command}`);
  execSync(command, { cwd: repoRoot, stdio: "inherit" });
}

export function main() {
  const flags = parseArgs(process.argv);
  const forceFlag = flags.force ? " --force" : "";
  const skipDbGenerateFlag = flags.skipDbGenerate ? " --skip-db-generate" : "";
  const shouldInstall = flags.install !== false && flags.skipInstall !== true;

  run(
    `pnpm create:block -- --block next-app --name ${flags.web} --port ${flags.webPort}${forceFlag} --skip-install`
  );
  run(
    `pnpm create:block -- --block nest-app --name ${flags.api} --port ${flags.apiPort}${forceFlag} --skip-install`
  );
  run(
    `pnpm create:block -- --block api-updator --app ${flags.api} --model ${flags.model}${forceFlag}${skipDbGenerateFlag}`
  );

  if (shouldInstall) {
    run("pnpm install");
  }
}

const invokedAsScript = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
  : false;

if (invokedAsScript) {
  main();
}
