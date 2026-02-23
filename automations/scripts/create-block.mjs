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

export function resolveScriptRoot(repoRoot) {
  if (process.env.SOLID_AUTO_APP_BLOCKS_SCRIPT_ROOT) {
    return path.resolve(process.env.SOLID_AUTO_APP_BLOCKS_SCRIPT_ROOT);
  }
  return repoRoot;
}

const repoRoot = resolveRepoRoot();
const scriptRoot = resolveScriptRoot(repoRoot);
const manifestsDir = path.join(repoRoot, "automations", "manifests");

export function parseArgs(argv) {
  const args = {
    block: undefined,
    list: false,
    help: false,
    dryRun: false,
    passthrough: [],
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
    if (token === "--block" || token === "-b") {
      args.block = tokens[index + 1];
      index += 1;
      continue;
    }
    if (token.startsWith("--block=")) {
      args.block = token.split("=")[1];
      continue;
    }

    args.passthrough.push(token);
  }

  return args;
}

export function loadManifests() {
  if (!fs.existsSync(manifestsDir)) return [];

  return fs
    .readdirSync(manifestsDir)
    .filter((entry) => entry.endsWith(".json"))
    .map((entry) => {
      const manifestPath = path.join(manifestsDir, entry);
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      const normalizedManifest = {
        fileName: entry.replace(/\.json$/, ""),
        manifestPath,
        ...manifest,
      };
      validateManifest(normalizedManifest);
      return normalizedManifest;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function printHelp(manifests) {
  console.log("Usage:");
  console.log("  pnpm create:block -- --block <name> [generator flags]");
  console.log("  pnpm create:block -- --list");
  console.log("  pnpm create:block -- --block <name> --dry-run [generator flags]");
  console.log("");
  console.log("Examples:");
  console.log("  pnpm create:block -- --block next-app --name admin --port 3002");
  console.log("  pnpm create:block -- --block nest-app --name api --port 3001");
  console.log("  pnpm create:block -- --block api-updator --app api --all");
  console.log("");
  printManifestList(manifests);
}

export function printManifestList(manifests) {
  console.log("Available blocks:");
  manifests.forEach((manifest) => {
    console.log(`  - ${manifest.name} (${manifest.fileName})`);
    if (manifest.description) {
      console.log(`    ${manifest.description}`);
    }
  });
}

function quoteArg(value) {
  return JSON.stringify(value);
}

const SUPPORTED_OPTION_TYPES = new Set(["string", "number", "boolean"]);

function assertManifestCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

export function validateManifest(manifest) {
  const source = manifest.manifestPath || manifest.name || "manifest";

  assertManifestCondition(
    typeof manifest.name === "string" && manifest.name.length > 0,
    `${source} is missing a non-empty "name".`
  );
  assertManifestCondition(
    typeof manifest.entry === "string" && manifest.entry.length > 0,
    `${source} is missing a non-empty "entry".`
  );
  assertManifestCondition(
    Array.isArray(manifest.options),
    `${source} is missing an "options" array.`
  );
  assertManifestCondition(
    Array.isArray(manifest.outputs),
    `${source} is missing an "outputs" array.`
  );

  const nodeEntryMatch = String(manifest.entry).trim().match(/^node\s+([^\s]+)([\s\S]*)$/);
  assertManifestCondition(
    Boolean(nodeEntryMatch),
    `${source} "entry" must start with "node <script-path>".`
  );

  const entryScriptPath = nodeEntryMatch[1];
  if (!path.isAbsolute(entryScriptPath)) {
    const absoluteEntryPath = path.join(scriptRoot, entryScriptPath);
    assertManifestCondition(
      fs.existsSync(absoluteEntryPath),
      `${source} entry script does not exist: ${entryScriptPath}`
    );
  }

  manifest.options.forEach((option, index) => {
    const optionLabel = `${source} option #${index + 1}`;
    assertManifestCondition(
      typeof option.flag === "string" && option.flag.startsWith("--"),
      `${optionLabel} must define a long-form "flag" (e.g. --name).`
    );
    assertManifestCondition(
      SUPPORTED_OPTION_TYPES.has(option.type),
      `${optionLabel} has unsupported type "${option.type}". Supported types: string, number, boolean.`
    );
    if (option.required !== undefined) {
      assertManifestCondition(
        typeof option.required === "boolean",
        `${optionLabel} has invalid "required" value; expected boolean.`
      );
    }
  });
}

function normalizeFlagName(flag) {
  return String(flag).replace(/^--/, "");
}

function parsePassthroughFlags(tokens) {
  const parsed = new Map();
  const seenFlags = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];

    if (!token.startsWith("--")) {
      throw new Error(
        `Unexpected positional argument "${token}". Pass values using "--flag value" or "--flag=value".`
      );
    }

    const [rawFlag, inlineValue] = token.split("=", 2);
    const normalizedFlag = normalizeFlagName(rawFlag);

    let value;
    if (inlineValue !== undefined) {
      value = inlineValue;
    } else if (tokens[index + 1] && !tokens[index + 1].startsWith("--")) {
      value = tokens[index + 1];
      index += 1;
    } else {
      value = true;
    }

    parsed.set(normalizedFlag, value);
    seenFlags.push(rawFlag);
  }

  return { parsed, seenFlags };
}

function parseBooleanFlagValue(rawValue, flag) {
  if (typeof rawValue === "boolean") return rawValue;
  const normalized = String(rawValue).toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  throw new Error(`Invalid boolean value for "${flag}": "${rawValue}". Use true or false.`);
}

function parseNumberFlagValue(rawValue, flag) {
  const parsedValue = Number(rawValue);
  if (Number.isNaN(parsedValue)) {
    throw new Error(`Invalid number value for "${flag}": "${rawValue}".`);
  }
  return parsedValue;
}

export function validatePassthroughArgs(manifest, passthrough) {
  const { parsed, seenFlags } = parsePassthroughFlags(passthrough);
  const allowedOptions = new Map(
    manifest.options.map((option) => [normalizeFlagName(option.flag), option])
  );

  seenFlags.forEach((rawFlag) => {
    const flagName = normalizeFlagName(rawFlag);
    if (!allowedOptions.has(flagName)) {
      const allowedFlags = manifest.options.map((option) => option.flag).join(", ");
      throw new Error(
        `Unknown flag "${rawFlag}" for block "${manifest.name}". Allowed flags: ${allowedFlags}.`
      );
    }
  });

  allowedOptions.forEach((option, flagName) => {
    const hasValue = parsed.has(flagName);
    if (option.required && !hasValue) {
      throw new Error(`Missing required option "${option.flag}" for block "${manifest.name}".`);
    }
    if (!hasValue) return;

    const rawValue = parsed.get(flagName);
    if (option.type === "string") {
      if (rawValue === true) {
        throw new Error(`Option "${option.flag}" requires a value.`);
      }
      const asString = String(rawValue);
      if (!asString.length) {
        throw new Error(`Option "${option.flag}" requires a non-empty string.`);
      }
      return;
    }

    if (option.type === "number") {
      if (rawValue === true) {
        throw new Error(`Option "${option.flag}" requires a numeric value.`);
      }
      parseNumberFlagValue(rawValue, option.flag);
      return;
    }

    if (option.type === "boolean") {
      parseBooleanFlagValue(rawValue, option.flag);
    }
  });
}

export function resolveManifestEntryCommand(entry) {
  const trimmed = String(entry).trim();
  const nodeCommandMatch = trimmed.match(/^node\s+([^\s]+)([\s\S]*)$/);
  if (!nodeCommandMatch) return trimmed;

  const scriptPath = nodeCommandMatch[1];
  const remainder = nodeCommandMatch[2] || "";
  if (path.isAbsolute(scriptPath)) return trimmed;

  const absoluteScriptPath = path.join(scriptRoot, scriptPath);
  return `node ${quoteArg(absoluteScriptPath)}${remainder}`;
}

export function runBlock(manifest, passthrough, options = {}) {
  const { dryRun = false } = options;
  const entryCommand = resolveManifestEntryCommand(manifest.entry);
  const quotedArgs = passthrough.map(quoteArg).join(" ");
  const command = `${entryCommand}${quotedArgs ? ` ${quotedArgs}` : ""}`;
  if (dryRun) {
    console.log(`[create-block] [dry-run] ${command}`);
    return;
  }
  console.log(`[create-block] ${command}`);
  execSync(command, { cwd: repoRoot, stdio: "inherit" });
}

export function main() {
  const args = parseArgs(process.argv);
  const manifests = loadManifests();

  if (args.help) {
    printHelp(manifests);
    return;
  }

  if (args.list) {
    printManifestList(manifests);
    return;
  }

  if (!args.block) {
    throw new Error('Missing "--block <name>". Run with "--list" to see available blocks.');
  }

  const manifest = manifests.find(
    (entry) => entry.name === args.block || entry.fileName === args.block
  );

  if (!manifest) {
    throw new Error(
      `Unknown block "${args.block}". Run "pnpm create:block -- --list" to see valid names.`
    );
  }

  validatePassthroughArgs(manifest, args.passthrough);
  runBlock(manifest, args.passthrough, { dryRun: args.dryRun });
}

const invokedAsScript = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
  : false;

if (invokedAsScript) {
  try {
    main();
  } catch (error) {
    console.error(`[create-block] ${error.message}`);
    process.exit(1);
  }
}
