const fs = require("fs");
const path = require("path");

const repoRoot = process.env.SOLID_AUTO_APP_BLOCKS_REPO_ROOT
  ? path.resolve(process.env.SOLID_AUTO_APP_BLOCKS_REPO_ROOT)
  : path.resolve(__dirname, "../../..");
const packagesDir = path.join(repoRoot, "packages");

function toCamelCase(input) {
  return input.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
}

function parseCliFlags(defaults = {}) {
  const args = { ...defaults };
  const tokens = process.argv.slice(2);

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (!token.startsWith("--")) continue;

    const [rawKey, rawValue] = token.replace(/^--/, "").split("=");
    const key = toCamelCase(rawKey);

    let value = rawValue;
    if (value === undefined && tokens[i + 1] && !tokens[i + 1].startsWith("--")) {
      value = tokens[i + 1];
      i += 1;
    }

    if (value === undefined) {
      args[key] = true;
      continue;
    }

    if (value === "true") {
      args[key] = true;
    } else if (value === "false") {
      args[key] = false;
    } else if (!Number.isNaN(Number(value)) && value.trim() !== "") {
      args[key] = Number(value);
    } else {
      args[key] = value;
    }
  }

  return args;
}

function ensureDirForFile(filePath) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
}

function writeFileSafe(filePath, content, options = {}) {
  const { force = false } = options;
  if (fs.existsSync(filePath) && !force) {
    throw new Error(`File already exists: ${filePath}`);
  }
  ensureDirForFile(filePath);
  fs.writeFileSync(filePath, content, "utf8");
}

function renderTemplate(template, variables) {
  return template.replace(/{{\s*([\w.]+)\s*}}/g, (_, key) => {
    const value = variables[key];
    return value === undefined ? "" : String(value);
  });
}

function formatJson(object) {
  return `${JSON.stringify(object, null, 2)}\n`;
}

function readWorkspacePackages() {
  if (!fs.existsSync(packagesDir)) return [];

  return fs
    .readdirSync(packagesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((entry) => {
      const packageJsonPath = path.join(packagesDir, entry.name, "package.json");
      if (!fs.existsSync(packageJsonPath)) return null;
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
      return {
        dir: entry.name,
        name: pkg.name,
        packageJsonPath,
      };
    })
    .filter(Boolean);
}

module.exports = {
  repoRoot,
  packagesDir,
  parseCliFlags,
  writeFileSafe,
  renderTemplate,
  formatJson,
  readWorkspacePackages,
};
