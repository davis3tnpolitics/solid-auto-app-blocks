#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function resolveRepoRoot() {
  if (process.env.SOLID_AUTO_APP_BLOCKS_REPO_ROOT) {
    return path.resolve(process.env.SOLID_AUTO_APP_BLOCKS_REPO_ROOT);
  }
  return path.resolve(__dirname, "../..");
}

export function resolveScriptRoot(repoRootValue) {
  if (process.env.SOLID_AUTO_APP_BLOCKS_SCRIPT_ROOT) {
    return path.resolve(process.env.SOLID_AUTO_APP_BLOCKS_SCRIPT_ROOT);
  }
  return repoRootValue;
}

const repoRoot = resolveRepoRoot();
const scriptRoot = resolveScriptRoot(repoRoot);
const workflowsDir = path.join(repoRoot, "automations", "workflows");
const createBlockScriptPath = path.join(scriptRoot, "automations", "scripts", "create-block.mjs");

function toCamelCase(value) {
  return value.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
}

function coerceValue(rawValue) {
  if (rawValue === true) return true;
  if (rawValue === "true") return true;
  if (rawValue === "false") return false;

  if (typeof rawValue === "string" && rawValue.trim() !== "" && !Number.isNaN(Number(rawValue))) {
    return Number(rawValue);
  }

  return rawValue;
}

export function parseArgs(argv) {
  const args = {
    workflow: undefined,
    list: false,
    help: false,
    dryRun: false,
    variables: {},
  };

  const tokens = argv.slice(2);
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === "--") continue;

    if (token === "--help" || token === "-h") {
      args.help = true;
      continue;
    }

    if (token === "--list") {
      args.list = true;
      continue;
    }

    if (token === "--dry-run") {
      args.dryRun = true;
      continue;
    }

    if (token === "--workflow" || token === "-w") {
      args.workflow = tokens[index + 1];
      index += 1;
      continue;
    }

    if (token.startsWith("--workflow=")) {
      args.workflow = token.split("=", 2)[1];
      continue;
    }

    if (!token.startsWith("--")) {
      throw new Error(`Unexpected positional argument "${token}".`);
    }

    const [rawKey, inlineValue] = token.slice(2).split("=", 2);
    const key = toCamelCase(rawKey);

    let value;
    if (inlineValue !== undefined) {
      value = inlineValue;
    } else if (tokens[index + 1] && !tokens[index + 1].startsWith("--")) {
      value = tokens[index + 1];
      index += 1;
    } else {
      value = true;
    }

    args.variables[key] = coerceValue(value);
  }

  return args;
}

function quoteArg(value) {
  return JSON.stringify(value);
}

function assertWorkflowCondition(condition, message) {
  if (!condition) throw new Error(message);
}

export function validateWorkflow(workflow, source) {
  assertWorkflowCondition(
    typeof workflow.name === "string" && workflow.name.length > 0,
    `${source} is missing a non-empty "name".`
  );
  assertWorkflowCondition(
    typeof workflow.description === "string",
    `${source} is missing a "description".`
  );
  assertWorkflowCondition(Array.isArray(workflow.steps), `${source} is missing a "steps" array.`);

  if (workflow.variables !== undefined) {
    assertWorkflowCondition(
      workflow.variables && typeof workflow.variables === "object" && !Array.isArray(workflow.variables),
      `${source} has invalid "variables" (expected object).`
    );
  }

  const stepIds = new Set();
  workflow.steps.forEach((step, index) => {
    const fallbackStepId = `step-${index + 1}`;
    const stepId = step.id || fallbackStepId;
    const stepLabel = `${source} step "${stepId}"`;

    assertWorkflowCondition(typeof step.block === "string" && step.block.length > 0, `${stepLabel} is missing "block".`);

    if (step.args !== undefined) {
      assertWorkflowCondition(Array.isArray(step.args), `${stepLabel} has invalid "args" (expected string array).`);
    }

    if (step.dependsOn !== undefined) {
      assertWorkflowCondition(
        Array.isArray(step.dependsOn),
        `${stepLabel} has invalid "dependsOn" (expected string array).`
      );
    }

    assertWorkflowCondition(!stepIds.has(stepId), `${source} has duplicate step id "${stepId}".`);
    stepIds.add(stepId);
  });

  const declaredStepIds = new Set(
    workflow.steps.map((step, index) => {
      if (step.id) return step.id;
      return `step-${index + 1}`;
    })
  );

  workflow.steps.forEach((step, index) => {
    const stepId = step.id || `step-${index + 1}`;
    const dependencies = Array.isArray(step.dependsOn) ? step.dependsOn : [];
    dependencies.forEach((dependency) => {
      assertWorkflowCondition(
        declaredStepIds.has(dependency),
        `${source} step "${stepId}" references unknown dependency "${dependency}".`
      );
    });
  });
}

export function loadWorkflows() {
  if (!fs.existsSync(workflowsDir)) return [];

  return fs
    .readdirSync(workflowsDir)
    .filter((entry) => entry.endsWith(".json"))
    .map((entry) => {
      const workflowPath = path.join(workflowsDir, entry);
      const workflow = JSON.parse(fs.readFileSync(workflowPath, "utf8"));
      const normalized = {
        fileName: entry.replace(/\.json$/, ""),
        workflowPath,
        ...workflow,
      };
      validateWorkflow(normalized, workflowPath);
      return normalized;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function printWorkflowList(workflows) {
  console.log("Available workflows:");
  workflows.forEach((workflow) => {
    console.log(`  - ${workflow.name} (${workflow.fileName})`);
    if (workflow.description) {
      console.log(`    ${workflow.description}`);
    }
  });
}

export function printHelp(workflows) {
  console.log("Usage:");
  console.log("  pnpm create:workflow -- --workflow <name> [--var value]");
  console.log("  pnpm create:workflow -- --workflow <name> --dry-run [--var value]");
  console.log("  pnpm create:workflow -- --list");
  console.log("");
  console.log("Examples:");
  console.log("  pnpm create:workflow -- --workflow examples");
  console.log("  pnpm create:workflow -- --workflow examples --web admin --api api --web-port 3200");
  console.log("");
  printWorkflowList(workflows);
}

export function resolveWorkflowSteps(workflow) {
  const stepsById = new Map();
  const inDegree = new Map();
  const nextSteps = new Map();

  workflow.steps.forEach((step, index) => {
    const id = step.id || `step-${index + 1}`;
    stepsById.set(id, {
      ...step,
      id,
      args: Array.isArray(step.args) ? step.args : [],
      dependsOn: Array.isArray(step.dependsOn) ? step.dependsOn : [],
    });
    inDegree.set(id, 0);
    nextSteps.set(id, []);
  });

  stepsById.forEach((step) => {
    step.dependsOn.forEach((dependencyId) => {
      inDegree.set(step.id, (inDegree.get(step.id) || 0) + 1);
      nextSteps.get(dependencyId).push(step.id);
    });
  });

  const queue = [];
  workflow.steps.forEach((step, index) => {
    const id = step.id || `step-${index + 1}`;
    if ((inDegree.get(id) || 0) === 0) {
      queue.push(id);
    }
  });

  const ordered = [];
  while (queue.length > 0) {
    const id = queue.shift();
    ordered.push(stepsById.get(id));

    nextSteps.get(id).forEach((neighborId) => {
      const remaining = (inDegree.get(neighborId) || 0) - 1;
      inDegree.set(neighborId, remaining);
      if (remaining === 0) {
        queue.push(neighborId);
      }
    });
  }

  if (ordered.length !== workflow.steps.length) {
    throw new Error(`Workflow "${workflow.name}" has circular dependencies.`);
  }

  return ordered;
}

export function interpolateTemplate(value, variables) {
  const input = String(value);

  return input.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, variableName) => {
    if (!(variableName in variables)) {
      throw new Error(`Missing workflow variable "${variableName}".`);
    }
    return String(variables[variableName]);
  });
}

export function resolveStepArgs(step, variables) {
  return step.args.map((arg) => interpolateTemplate(arg, variables));
}

function runCommand(command, dryRun) {
  if (dryRun) {
    console.log(`[create:workflow] [dry-run] ${command}`);
    return;
  }

  console.log(`[create:workflow] ${command}`);
  execSync(command, { cwd: repoRoot, stdio: "inherit" });
}

export function runWorkflow(workflow, variables, dryRun = false) {
  const orderedSteps = resolveWorkflowSteps(workflow);

  orderedSteps.forEach((step) => {
    const resolvedArgs = resolveStepArgs(step, variables);
    const command = `node ${quoteArg(createBlockScriptPath)} "--block" ${quoteArg(step.block)} ${resolvedArgs
      .map(quoteArg)
      .join(" ")}`;
    runCommand(command, dryRun);
  });
}

export function main() {
  if (!fs.existsSync(createBlockScriptPath)) {
    throw new Error(`create-block script not found at ${createBlockScriptPath}.`);
  }

  const args = parseArgs(process.argv);
  const workflows = loadWorkflows();

  if (args.help) {
    printHelp(workflows);
    return;
  }

  if (args.list) {
    printWorkflowList(workflows);
    return;
  }

  if (!args.workflow) {
    throw new Error('Missing "--workflow <name>". Run with "--list" to see available workflows.');
  }

  const workflow = workflows.find(
    (entry) => entry.name === args.workflow || entry.fileName === args.workflow
  );

  if (!workflow) {
    throw new Error(
      `Unknown workflow "${args.workflow}". Run "pnpm create:workflow -- --list" to see valid names.`
    );
  }

  const mergedVariables = {
    ...(workflow.variables || {}),
    ...args.variables,
  };

  runWorkflow(workflow, mergedVariables, args.dryRun);
}

const invokedAsScript = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
  : false;

if (invokedAsScript) {
  try {
    main();
  } catch (error) {
    console.error(`[create:workflow] ${error.message}`);
    process.exit(1);
  }
}
