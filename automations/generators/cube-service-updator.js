#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { repoRoot, parseCliFlags } = require("./_shared/utils");

function main() {
  try {
    const flags = parseCliFlags({
      force: true,
      all: false,
      skipDbGenerate: false,
      tenantField: "tenantId",
    });
    const appName = flags.app || flags.appName;
    const modelsInput = flags.models || flags.model || flags.entity;
    const useAllModels = Boolean(flags.all);

    if (!appName) {
      throw new Error('Provide an app name with "--app <name>".');
    }

    if (!useAllModels && !modelsInput) {
      throw new Error(
        'Provide at least one model with "--model <Model>" or "--models ModelA,ModelB", or pass "--all".'
      );
    }

    const appDir = path.join(repoRoot, "apps", appName);
    if (!fs.existsSync(appDir)) {
      throw new Error(`App not found at ${appDir}`);
    }

    ensureWorkspaceDependency({ appDir, dependencyName: "cube-helpers" });

    if (!flags.skipDbGenerate) {
      runDbGenerate();
    } else {
      console.log("[cube-service-updator] Skipping database db:generate (--skip-db-generate).");
    }

    const models = useAllModels
      ? readAllPrismaModelNames()
      : parseCsvList(modelsInput).map((model) => toPascalCase(model));

    if (!models.length) {
      throw new Error(
        'No models were found to update. Ensure database contracts are generated or provide "--model".'
      );
    }

    models.forEach((modelNameRaw) => {
      const modelName = toPascalCase(modelNameRaw);
      scaffoldCubeService({
        appDir,
        modelName,
        force: Boolean(flags.force),
        tenantField: String(flags.tenantField || "").trim(),
      });
    });

    console.log(
      `[cube-service-updator] Added Cube analytics scaffolding for ${models
        .map(toPascalCase)
        .join(", ")} in apps/${appName}`
    );
  } catch (error) {
    console.error(`[cube-service-updator] ${error.message}`);
    process.exit(1);
  }
}

function runDbGenerate() {
  try {
    execSync("pnpm --filter database db:generate", {
      cwd: repoRoot,
      stdio: "inherit",
    });
  } catch (error) {
    throw new Error(`Failed to generate database contracts (${error.message})`);
  }
}

function ensureWorkspaceDependency({ appDir, dependencyName }) {
  const packageJsonPath = path.join(appDir, "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    return;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  const dependencies = packageJson.dependencies || {};

  if (dependencies[dependencyName]) {
    return;
  }

  dependencies[dependencyName] = "workspace:*";
  packageJson.dependencies = Object.fromEntries(
    Object.entries(dependencies).sort(([left], [right]) => left.localeCompare(right))
  );

  fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");
}

function scaffoldCubeService({ appDir, modelName, force, tenantField }) {
  const analyticsRoot = path.join(appDir, "src", "analytics");
  const cubesDir = path.join(analyticsRoot, "cubes");
  const contractsDir = path.join(analyticsRoot, "contracts");
  const modelSlug = kebabCase(modelName);
  const cubePath = path.join(cubesDir, `${modelSlug}.cube.ts`);
  const contractPath = path.join(contractsDir, `${modelSlug}.analytics.ts`);
  const indexPath = path.join(analyticsRoot, "index.ts");

  fs.mkdirSync(cubesDir, { recursive: true });
  fs.mkdirSync(contractsDir, { recursive: true });

  const contractFields = readContractFields(modelName);
  const analyticsSpec = buildAnalyticsSpec({ modelName, contractFields, tenantField });

  writeFileRespectingDirective(cubePath, buildCubeFileContent(analyticsSpec), force);
  writeFileRespectingDirective(contractPath, buildContractFileContent(analyticsSpec), force);
  upsertAnalyticsIndex(indexPath, analyticsSpec);
}

function buildAnalyticsSpec({ modelName, contractFields, tenantField }) {
  const fieldSpecs = contractFields
    .map((field) => ({
      ...field,
      analyticsType: inferAnalyticsFieldType(field.name, field.type),
    }))
    .filter((field) => field.analyticsType !== null);

  const dimensions = fieldSpecs.filter(
    (field) => field.analyticsType === "id" || field.analyticsType === "string" || field.analyticsType === "boolean"
  );
  const numericFields = fieldSpecs.filter((field) => field.analyticsType === "number");
  const timeDimensions = fieldSpecs.filter((field) => field.analyticsType === "date");
  const primaryKeyField =
    dimensions.find((field) => field.name === "id") || dimensions.find((field) => field.analyticsType === "id");

  const measures = [];
  measures.push({ name: "count", type: "count" });
  numericFields.forEach((field) => {
    const suffix = toPascalCase(field.name);
    measures.push({ name: `sum${suffix}`, type: "sum", field: field.name });
    measures.push({ name: `avg${suffix}`, type: "avg", field: field.name });
    measures.push({ name: `min${suffix}`, type: "min", field: field.name });
    measures.push({ name: `max${suffix}`, type: "max", field: field.name });
    measures.push({ name: `total${suffix}`, type: "sum", field: field.name });
  });

  return {
    modelName,
    modelSlug: kebabCase(modelName),
    modelCamel: toCamelCase(modelName),
    modelPluralCamel: toCamelCase(pluralizeWord(modelName)),
    cubeName: pluralizeWord(toPascalCase(modelName)),
    sqlTable: `public.${pluralizeWord(modelSlugToSqlTable(kebabCase(modelName)))}`,
    dimensions,
    primaryKey: primaryKeyField ? primaryKeyField.name : "id",
    numericFields: numericFields.map((field) => field.name),
    timeDimensions: timeDimensions.map((field) => field.name),
    defaultTimeDimension: timeDimensions[0] ? timeDimensions[0].name : null,
    measures,
    totals: measures.filter((measure) => measure.name.startsWith("total") || measure.name === "count"),
    tenantField: tenantField || null,
  };
}

function buildCubeFileContent(spec) {
  const dimensions = spec.dimensions.length
    ? spec.dimensions
        .map(
          (field) =>
            `  { name: "${field.name}", type: "${toCubeDimensionType(field.analyticsType)}", primaryKey: ${field.name === spec.primaryKey} },`
        )
        .join("\n")
    : "  // Add model-specific dimensions here.";
  const scopedFilters = spec.tenantField ? `"${spec.tenantField}"` : "";

  return `import {
  buildCubeService,
  createDefaultDimensions,
  createDefaultMeasures,
  createDefaultPreAggregations,
  createDefaultTimeDimensions,
} from "cube-helpers";

const dimensions = createDefaultDimensions([
${dimensions}
]);

const measures = createDefaultMeasures({
  numericFields: [${asQuotedList(spec.numericFields)}],
  includeCount: true,
  includeTotals: true,
});

const timeDimensions = createDefaultTimeDimensions([${asQuotedList(spec.timeDimensions)}]);

export default buildCubeService({
  cube: "${spec.cubeName}",
  sqlTable: "${spec.sqlTable}",
  dimensions,
  timeDimensions,
  measures,
  preAggregations: createDefaultPreAggregations({
    timeDimension: ${spec.defaultTimeDimension ? `"${spec.defaultTimeDimension}"` : "undefined"},
    measureNames: measures.map((measure) => measure.name),
  }),
  securityContext: {
    requiredFilters: [${scopedFilters}],
  },
});
`;
}

function buildContractFileContent(spec) {
  const contractName = `${spec.modelCamel}AnalyticsContract`;

  return `import type { AnalyticsQueryContract } from "cube-helpers";

export const ${contractName}: AnalyticsQueryContract = {
  cube: "${spec.cubeName}",
  dimensions: [${asQuotedList(spec.dimensions.map((field) => field.name))}],
  measures: [${asQuotedList(spec.measures.map((measure) => measure.name))}],
  totals: [${asQuotedList(spec.totals.map((measure) => measure.name))}],
  timeDimensions: [${asQuotedList(spec.timeDimensions)}],
  defaultTimeDimension: ${spec.defaultTimeDimension ? `"${spec.defaultTimeDimension}"` : "undefined"},
  scopedFilters: [${spec.tenantField ? `"${spec.tenantField}"` : ""}],
};
`;
}

function upsertAnalyticsIndex(indexPath, spec) {
  const lines = [
    `export { default as ${spec.modelName}Cube } from "./cubes/${spec.modelSlug}.cube";`,
    `export { ${spec.modelCamel}AnalyticsContract } from "./contracts/${spec.modelSlug}.analytics";`,
  ];

  if (!fs.existsSync(indexPath)) {
    fs.mkdirSync(path.dirname(indexPath), { recursive: true });
    fs.writeFileSync(indexPath, `${lines.join("\n")}\n`, "utf8");
    return;
  }

  const current = fs.readFileSync(indexPath, "utf8");
  if (hasNoAutoUpdateDirective(current)) {
    return;
  }

  const missingLines = lines.filter((line) => !current.includes(line));
  if (!missingLines.length) return;

  const nextContent = `${current.trimEnd()}\n${missingLines.join("\n")}\n`;
  fs.writeFileSync(indexPath, nextContent, "utf8");
}

function readAllPrismaModelNames() {
  const prismaDir = path.join(repoRoot, "packages", "database", "prisma");
  if (!fs.existsSync(prismaDir)) {
    throw new Error(`Prisma directory not found at ${prismaDir}`);
  }

  const modelNames = new Set();
  const files = walkDir(prismaDir).filter((file) => file.endsWith(".prisma"));

  files.forEach((filePath) => {
    const content = fs.readFileSync(filePath, "utf8");
    const regex = /model\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{/g;
    let match = regex.exec(content);
    while (match) {
      modelNames.add(match[1]);
      match = regex.exec(content);
    }
  });

  return Array.from(modelNames).sort();
}

function readContractFields(modelName) {
  const contractPath = path.join(
    repoRoot,
    "packages",
    "database",
    "contracts",
    "models",
    `${modelName}.model.ts`
  );

  if (!fs.existsSync(contractPath)) {
    throw new Error(
      `Contract model for ${modelName} not found at ${contractPath}. Run "pnpm --filter database db:generate".`
    );
  }

  const source = fs.readFileSync(contractPath, "utf8");
  const fields = [];
  const fieldRegex =
    /^\s*(?:public\s+|private\s+|protected\s+|readonly\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*[!?]?\s*:\s*([^;]+);/gm;

  let match = fieldRegex.exec(source);
  while (match) {
    fields.push({
      name: match[1],
      type: String(match[2]).trim(),
    });
    match = fieldRegex.exec(source);
  }

  if (!fields.length) {
    throw new Error(`No contract fields were detected for ${modelName} at ${contractPath}.`);
  }

  return fields;
}

function walkDir(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) return walkDir(fullPath);
    return [fullPath];
  });
}

function parseCsvList(value) {
  if (value === undefined || value === null || value === "") return [];
  return String(value)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function inferAnalyticsFieldType(fieldName, inputType) {
  const normalizedType = String(inputType || "")
    .replace(/\s+/g, "")
    .replace(/\|null/g, "")
    .replace(/\|undefined/g, "")
    .toLowerCase();
  const normalizedFieldName = String(fieldName || "").toLowerCase();

  if (!normalizedType || normalizedType.endsWith("[]")) return null;
  if (normalizedType.includes("date")) return "date";
  if (normalizedType.includes("boolean")) return "boolean";
  if (
    normalizedType.includes("number") ||
    normalizedType.includes("int") ||
    normalizedType.includes("float") ||
    normalizedType.includes("decimal") ||
    normalizedType.includes("bigint")
  ) {
    return "number";
  }
  if (
    normalizedFieldName === "id" ||
    normalizedFieldName.endsWith("id") ||
    normalizedFieldName.endsWith("_id")
  ) {
    return "id";
  }
  if (normalizedType.includes("string")) return "string";
  return null;
}

function modelSlugToSqlTable(value) {
  return String(value).replace(/-/g, "_");
}

function hasNoAutoUpdateDirective(content) {
  return /^\s*\/\*_?\s*no-auto-update\s*_?\*\//.test(String(content || ""));
}

function writeFileRespectingDirective(filePath, content, force) {
  if (fs.existsSync(filePath)) {
    const existing = fs.readFileSync(filePath, "utf8");
    if (hasNoAutoUpdateDirective(existing)) {
      console.warn(
        `[cube-service-updator] Skipped ${path.relative(
          repoRoot,
          filePath
        )} (no-auto-update directive present).`
      );
      return;
    }
    if (!force) {
      console.warn(
        `[cube-service-updator] Skipped ${path.relative(
          repoRoot,
          filePath
        )} (existing file and --force=false).`
      );
      return;
    }
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function asQuotedList(list) {
  return list.map((item) => `"${item}"`).join(", ");
}

function toCubeDimensionType(analyticsType) {
  if (analyticsType === "date") return "time";
  if (analyticsType === "number") return "number";
  if (analyticsType === "boolean") return "boolean";
  return "string";
}

function toPascalCase(value) {
  const camel = toCamelCase(value);
  return camel ? camel[0].toUpperCase() + camel.slice(1) : "";
}

function toCamelCase(value) {
  return String(value || "")
    .replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ""))
    .replace(/^(.)/, (char) => char.toLowerCase());
}

function kebabCase(value) {
  return String(value || "")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[_\s]+/g, "-")
    .toLowerCase();
}

function pluralizeWord(value) {
  if (String(value).endsWith("ch") || String(value).endsWith("sh")) return `${value}es`;
  if (/[sxz]$/.test(String(value))) return `${value}es`;
  if (/[^aeiou]y$/i.test(String(value))) return `${String(value).slice(0, -1)}ies`;
  return `${value}s`;
}

if (require.main === module) {
  main();
}

module.exports = {
  main,
  readAllPrismaModelNames,
  readContractFields,
  parseCsvList,
  inferAnalyticsFieldType,
  hasNoAutoUpdateDirective,
  writeFileRespectingDirective,
  pluralizeWord,
  toCamelCase,
  toPascalCase,
  kebabCase,
};
