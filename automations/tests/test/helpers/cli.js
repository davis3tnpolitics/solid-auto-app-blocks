const { spawnSync } = require("child_process");
const path = require("path");
const { repoRoot } = require("./workspace");

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

  const result = spawnSync("pnpm", args, {
    cwd,
    env,
    encoding: "utf8",
  });

  const stdout = result.stdout || "";
  const stderr = result.stderr || "";
  const output = [stdout, stderr].filter(Boolean).join("\n");

  if (!allowFailure && result.status !== 0) {
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
