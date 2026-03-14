const { spawnSync } = require("child_process");
const process = require("process");
const path = require("path");
const { repoRoot } = require("./workspace");

function buildSpawnOptions({ cwd, env }) {
  return {
    cwd,
    env,
    encoding: "utf8",
  };
}

function runPnpmCommand(args, spawnOptions) {
  const candidates = [];

  if (process.platform === "win32") {
    candidates.push({
      command: "pnpm.cmd",
      commandArgs: args,
    });
  }

  candidates.push({
    command: "pnpm",
    commandArgs: args,
  });

  if (process.env.npm_execpath) {
    candidates.push({
      command: process.execPath,
      commandArgs: [process.env.npm_execpath, ...args],
    });
  }

  let lastResult = null;

  for (const candidate of candidates) {
    const result = spawnSync(candidate.command, candidate.commandArgs, spawnOptions);
    lastResult = result;

    if (!result.error) {
      return result;
    }

    if (result.error.code !== "ENOENT") {
      return result;
    }
  }

  return lastResult;
}

function runPnpm(args, options = {}) {
  const {
    cwd = repoRoot,
    workspaceRoot,
    allowFailure = false,
    extraEnv = {},
  } = options;

  const env = {
    ...process.env,
    ...extraEnv,
  };

  if (workspaceRoot) {
    env.SOLID_AUTO_APP_BLOCKS_REPO_ROOT = path.resolve(workspaceRoot);
    env.SOLID_AUTO_APP_BLOCKS_SCRIPT_ROOT = repoRoot;
  }

  const result = runPnpmCommand(args, buildSpawnOptions({ cwd, env }));

  const stdout = result.stdout || "";
  const stderr = result.stderr || "";
  const processError = result.error ? String(result.error.message || result.error) : "";
  const output = [stdout, stderr, processError].filter(Boolean).join("\n");

  const failed = Boolean(result.error) || result.status !== 0;

  if (!allowFailure && failed) {
    throw new Error(`Command failed: pnpm ${args.join(" ")}\n${output}`);
  }

  return {
    ...result,
    stdout,
    stderr,
    output,
  };
}

function runCreateBlock(flags, options = {}) {
  return runPnpm(["create:block", "--", ...flags], options);
}

function runCreateWorkflow(flags, options = {}) {
  return runPnpm(["create:workflow", "--", ...flags], options);
}

module.exports = {
  runPnpm,
  runCreateBlock,
  runCreateWorkflow,
};
