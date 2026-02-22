#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const manifestsDir = path.join(repoRoot, "automations", "manifests");

function parseArgs(argv) {
  const args = {
    block: undefined,
    list: false,
    help: false,
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

function loadManifests() {
  if (!fs.existsSync(manifestsDir)) return [];

  return fs
    .readdirSync(manifestsDir)
    .filter((entry) => entry.endsWith(".json"))
    .map((entry) => {
      const manifestPath = path.join(manifestsDir, entry);
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      return {
        fileName: entry.replace(/\.json$/, ""),
        manifestPath,
        ...manifest,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function printHelp(manifests) {
  console.log("Usage:");
  console.log("  pnpm create:block -- --block <name> [generator flags]");
  console.log("  pnpm create:block -- --list");
  console.log("");
  console.log("Examples:");
  console.log("  pnpm create:block -- --block next-app --name admin --port 3002");
  console.log("  pnpm create:block -- --block nest-app --name api --port 3001");
  console.log("  pnpm create:block -- --block api-updator --app api --all");
  console.log("");
  printManifestList(manifests);
}

function printManifestList(manifests) {
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

function runBlock(manifest, passthrough) {
  const quotedArgs = passthrough.map(quoteArg).join(" ");
  const command = `${manifest.entry}${quotedArgs ? ` ${quotedArgs}` : ""}`;
  console.log(`[create-block] ${command}`);
  execSync(command, { cwd: repoRoot, stdio: "inherit" });
}

function main() {
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

  runBlock(manifest, args.passthrough);
}

try {
  main();
} catch (error) {
  console.error(`[create-block] ${error.message}`);
  process.exit(1);
}
