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

const manifestsDir = path.join(repoRoot, "automations", "manifests");
const workflowsDir = path.join(repoRoot, "automations", "workflows");
const readmePath = path.join(repoRoot, "README.md");
const contributingPath = path.join(repoRoot, "CONTRIBUTING.md");
const changelogPath = path.join(repoRoot, "CHANGELOG.md");

const SUPPORTED_OPTION_TYPES = new Set(["string", "number", "boolean"]);

function listJsonFiles(directory) {
  if (!fs.existsSync(directory)) return [];

  return fs
    .readdirSync(directory)
    .filter((entry) => entry.endsWith(".json"))
    .sort()
    .map((entry) => path.join(directory, entry));
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function toRelative(filePath) {
  return path.relative(repoRoot, filePath).replace(/\\/g, "/");
}

function assert(condition, errors, message) {
  if (!condition) {
    errors.push(message);
  }
}

function validateManifestFiles() {
  const errors = [];
  const manifestFiles = listJsonFiles(manifestsDir);
  const manifests = manifestFiles.map((manifestPath) => {
    const fileName = path.basename(manifestPath, ".json");
    const manifest = readJson(manifestPath);
    const source = toRelative(manifestPath);

    assert(typeof manifest.name === "string" && manifest.name.length > 0, errors, `${source}: missing non-empty "name".`);
    assert(manifest.name === fileName, errors, `${source}: manifest name must match filename (${fileName}).`);
    assert(typeof manifest.description === "string", errors, `${source}: missing "description" string.`);
    assert(typeof manifest.entry === "string" && manifest.entry.length > 0, errors, `${source}: missing non-empty "entry".`);
    assert(Array.isArray(manifest.options), errors, `${source}: missing "options" array.`);
    assert(Array.isArray(manifest.outputs), errors, `${source}: missing "outputs" array.`);

    const entryMatch = String(manifest.entry || "").trim().match(/^node\s+([^\s]+)([\s\S]*)$/);
    assert(Boolean(entryMatch), errors, `${source}: "entry" must start with "node <script-path>".`);

    if (entryMatch) {
      const scriptPath = entryMatch[1];
      const absoluteScriptPath = path.isAbsolute(scriptPath)
        ? scriptPath
        : path.join(repoRoot, scriptPath);
      assert(fs.existsSync(absoluteScriptPath), errors, `${source}: entry script does not exist (${scriptPath}).`);
    }

    const optionFlags = new Set();
    (manifest.options || []).forEach((option, index) => {
      const label = `${source}: option #${index + 1}`;

      assert(
        typeof option.flag === "string" && option.flag.startsWith("--"),
        errors,
        `${label} must have a long-form flag (e.g. --name).`
      );
      assert(
        SUPPORTED_OPTION_TYPES.has(option.type),
        errors,
        `${label} has unsupported type "${option.type}".`
      );

      if (typeof option.flag === "string") {
        assert(!optionFlags.has(option.flag), errors, `${label} duplicates flag ${option.flag}.`);
        optionFlags.add(option.flag);
      }

      if (option.required !== undefined) {
        assert(
          typeof option.required === "boolean",
          errors,
          `${label} "required" must be boolean when provided.`
        );
      }
    });

    return {
      source,
      fileName,
      manifest,
    };
  });

  const names = manifests.map((entry) => entry.manifest.name).filter(Boolean);
  assert(new Set(names).size === names.length, errors, "manifest names must be unique.");

  return {
    manifests,
    errors,
  };
}

function extractTemplateVars(value) {
  const vars = [];
  const input = String(value || "");
  const regex = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  let match = regex.exec(input);

  while (match) {
    vars.push(match[1]);
    match = regex.exec(input);
  }

  return vars;
}

function validateWorkflowFiles(knownBlocks) {
  const errors = [];
  const workflowFiles = listJsonFiles(workflowsDir);

  const workflows = workflowFiles.map((workflowPath) => {
    const fileName = path.basename(workflowPath, ".json");
    const workflow = readJson(workflowPath);
    const source = toRelative(workflowPath);

    assert(typeof workflow.name === "string" && workflow.name.length > 0, errors, `${source}: missing non-empty "name".`);
    assert(workflow.name === fileName, errors, `${source}: workflow name must match filename (${fileName}).`);
    assert(typeof workflow.description === "string", errors, `${source}: missing "description" string.`);
    assert(Array.isArray(workflow.steps), errors, `${source}: missing "steps" array.`);

    const variables = workflow.variables || {};
    if (workflow.variables !== undefined) {
      assert(
        workflow.variables && typeof workflow.variables === "object" && !Array.isArray(workflow.variables),
        errors,
        `${source}: "variables" must be an object when provided.`
      );
    }

    const stepIds = new Set();
    const resolvedStepIds = [];

    (workflow.steps || []).forEach((step, index) => {
      const stepId = step.id || `step-${index + 1}`;
      const label = `${source}: step "${stepId}"`;

      resolvedStepIds.push(stepId);
      assert(!stepIds.has(stepId), errors, `${label} duplicates an existing step id.`);
      stepIds.add(stepId);

      assert(typeof step.block === "string" && step.block.length > 0, errors, `${label} missing "block".`);
      if (typeof step.block === "string") {
        assert(knownBlocks.has(step.block), errors, `${label} references unknown block "${step.block}".`);
      }

      if (step.args !== undefined) {
        assert(Array.isArray(step.args), errors, `${label} "args" must be an array when provided.`);
      }

      if (step.dependsOn !== undefined) {
        assert(Array.isArray(step.dependsOn), errors, `${label} "dependsOn" must be an array when provided.`);
      }

      (step.args || []).forEach((arg) => {
        assert(typeof arg === "string", errors, `${label} has non-string arg value.`);
        extractTemplateVars(arg).forEach((variable) => {
          assert(variable in variables, errors, `${label} references undefined variable "${variable}".`);
        });
      });
    });

    const stepSet = new Set(resolvedStepIds);
    (workflow.steps || []).forEach((step, index) => {
      const stepId = step.id || `step-${index + 1}`;
      (step.dependsOn || []).forEach((dependency) => {
        assert(stepSet.has(dependency), errors, `${source}: step "${stepId}" depends on unknown step "${dependency}".`);
      });
    });

    return {
      source,
      fileName,
      workflow,
    };
  });

  const names = workflows.map((entry) => entry.workflow.name).filter(Boolean);
  assert(new Set(names).size === names.length, errors, "workflow names must be unique.");

  return {
    workflows,
    errors,
  };
}

function runGit(command) {
  try {
    return execSync(command, {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8",
    });
  } catch {
    return null;
  }
}

function parseChangedFileOutput(output) {
  if (!output) return [];

  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/\\/g, "/"));
}

function getChangedFiles() {
  if (process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true") {
    if (process.env.GITHUB_BASE_REF) {
      const prDiff = runGit(`git diff --name-only origin/${process.env.GITHUB_BASE_REF}...HEAD`);
      if (prDiff) return parseChangedFileOutput(prDiff);
    }

    const pushDiff = runGit("git diff --name-only HEAD~1..HEAD");
    if (pushDiff) return parseChangedFileOutput(pushDiff);

    return [];
  }

  const workingTree = runGit("git diff --name-only");
  const staged = runGit("git diff --name-only --cached");
  const untracked = runGit("git ls-files --others --exclude-standard");

  return Array.from(
    new Set([
      ...parseChangedFileOutput(workingTree),
      ...parseChangedFileOutput(staged),
      ...parseChangedFileOutput(untracked),
    ])
  );
}

function validateDocsAndChangelogSync(changedFiles) {
  const errors = [];
  const manifestOrWorkflowChanged = changedFiles.some(
    (filePath) =>
      filePath.startsWith("automations/manifests/") || filePath.startsWith("automations/workflows/")
  );

  if (!manifestOrWorkflowChanged) {
    return errors;
  }

  const hasReadmeUpdate = changedFiles.includes("README.md");
  const hasContributingUpdate = changedFiles.includes("CONTRIBUTING.md");
  const hasChangelogUpdate = changedFiles.includes("CHANGELOG.md");
  const hasChangeset = changedFiles.some(
    (filePath) => filePath.startsWith(".changeset/") && filePath.endsWith(".md")
  );

  assert(fs.existsSync(readmePath), errors, "README.md is required for docs sync checks.");
  assert(fs.existsSync(contributingPath), errors, "CONTRIBUTING.md is required for docs sync checks.");

  assert(
    hasReadmeUpdate,
    errors,
    "Manifest/workflow changes require updating README.md with command/interface notes."
  );
  assert(
    hasContributingUpdate,
    errors,
    "Manifest/workflow changes require updating CONTRIBUTING.md with governance/testing expectations."
  );

  if (!fs.existsSync(changelogPath) && !hasChangeset) {
    errors.push(
      "Manifest/workflow changes require CHANGELOG.md or a .changeset/*.md entry to track contract changes."
    );
  } else {
    assert(
      hasChangelogUpdate || hasChangeset,
      errors,
      "Manifest/workflow changes require CHANGELOG.md or a .changeset/*.md entry in the same change."
    );
  }

  return errors;
}

function main() {
  const manifestResult = validateManifestFiles();
  const knownBlocks = new Set(manifestResult.manifests.map((entry) => entry.manifest.name));
  const workflowResult = validateWorkflowFiles(knownBlocks);
  const changedFiles = getChangedFiles();
  const docsSyncErrors = validateDocsAndChangelogSync(changedFiles);

  const errors = [...manifestResult.errors, ...workflowResult.errors, ...docsSyncErrors];

  if (errors.length > 0) {
    console.error("[lint:automation-contracts] Found issues:");
    errors.forEach((error) => {
      console.error(`- ${error}`);
    });
    process.exit(1);
  }

  const changedInfo = changedFiles.length > 0 ? `${changedFiles.length} changed file(s) inspected` : "no changed files detected";
  console.log(`[lint:automation-contracts] OK (${manifestResult.manifests.length} manifests, ${workflowResult.workflows.length} workflows, ${changedInfo}).`);
}

main();
