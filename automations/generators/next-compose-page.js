#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const {
  repoRoot,
  scriptRoot,
  parseCliFlags,
  renderTemplate,
} = require("./_shared/utils");
const { parseAnalyticsContractSource } = require("./next-analytics-pages");

const SUPPORTED_LAYOUTS = new Set(["stack", "split", "grid"]);
const SUPPORTED_SECTION_TYPES = new Set([
  "crud-list",
  "analytics-bar-chart",
  "analytics-line-chart",
  "analytics-table",
]);

function main() {
  try {
    const flags = parseCliFlags({
      force: true,
      preset: "dashboard-basic",
      analyticsApp: "api",
      model: "User",
      route: "dashboard",
    });

    const appName = flags.app || flags.appName;
    if (!appName) {
      throw new Error('Provide a Next app name with "--app <name>".');
    }

    const appDir = path.join(repoRoot, "apps", appName);
    if (!fs.existsSync(appDir)) {
      throw new Error(`App not found at ${appDir}`);
    }

    const spec = loadPageSpec(flags);
    const resolvedSpec = resolveSpecContracts(spec, {
      analyticsAppDefault: String(flags.analyticsApp || "api"),
    });
    const pageSource = createPageSource(resolvedSpec);

    const targetPath = path.join(appDir, "src", "app", ...resolvedSpec.route.split("/"), "page.tsx");
    writeFileRespectingDirective(targetPath, pageSource, Boolean(flags.force));

    console.log(
      `[next-compose-page] Generated composed page at apps/${appName}/src/app/${resolvedSpec.route}/page.tsx`
    );
  } catch (error) {
    console.error(`[next-compose-page] ${error.message}`);
    process.exit(1);
  }
}

function loadPageSpec(flags) {
  const variableMap = {
    model: toPascalCase(String(flags.model || "User")),
    route: normalizeRoutePath(String(flags.route || "dashboard")),
    analyticsApp: String(flags.analyticsApp || "api"),
  };

  const specPath = resolveSpecPath(flags);
  if (specPath) {
    return parseSpecFromFile(specPath, variableMap);
  }

  return createFallbackSpec(variableMap);
}

function resolveSpecPath(flags) {
  if (flags.spec) {
    return resolvePathFromRoot(String(flags.spec), repoRoot);
  }

  if (flags.preset && String(flags.preset).toLowerCase() !== "none") {
    return resolvePresetPath(String(flags.preset));
  }

  return null;
}

function resolvePresetPath(presetValue) {
  const normalizedPreset = String(presetValue || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\//, "")
    .replace(/\.json$/, "");
  if (!normalizedPreset) return null;

  const candidatePaths = [
    path.join(repoRoot, "automations", "specs", "pages", `${normalizedPreset}.json`),
    path.join(scriptRoot, "automations", "specs", "pages", `${normalizedPreset}.json`),
  ];

  const existing = candidatePaths.find((candidate) => fs.existsSync(candidate));
  if (!existing) {
    throw new Error(
      `Preset "${presetValue}" was not found in automations/specs/pages.`
    );
  }

  return existing;
}

function resolvePathFromRoot(inputPath, rootDir) {
  const absolutePath = path.isAbsolute(inputPath)
    ? inputPath
    : path.resolve(rootDir, inputPath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Spec file not found at ${absolutePath}`);
  }
  return absolutePath;
}

function parseSpecFromFile(filePath, variables) {
  const raw = fs.readFileSync(filePath, "utf8");
  const rendered = renderTemplate(raw, variables);
  let parsed;
  try {
    parsed = JSON.parse(rendered);
  } catch (error) {
    throw new Error(
      `Failed to parse JSON spec at ${filePath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  return normalizeSpec(parsed, path.relative(repoRoot, filePath));
}

function createFallbackSpec(variables) {
  return normalizeSpec(
    {
      kind: "next-page-spec",
      version: 1,
      route: variables.route,
      title: `${variables.model} Dashboard`,
      description: `Composed dashboard page for ${variables.model}.`,
      layout: "stack",
      sections: [
        {
          type: "crud-list",
          contractRef: {
            source: "database",
            model: variables.model,
          },
        },
        {
          type: "analytics-bar-chart",
          contractRef: {
            source: "analytics",
            app: variables.analyticsApp,
            model: variables.model,
          },
        },
      ],
    },
    "generated-fallback"
  );
}

function normalizeSpec(input, sourceLabel = "inline") {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error(`Invalid page spec from ${sourceLabel}. Expected an object.`);
  }

  const kind = String(input.kind || "next-page-spec");
  if (kind !== "next-page-spec") {
    throw new Error(`Invalid page spec kind "${kind}" in ${sourceLabel}.`);
  }

  const version = Number(input.version || 1);
  if (!Number.isFinite(version) || version < 1) {
    throw new Error(`Invalid page spec version in ${sourceLabel}.`);
  }

  const route = normalizeRoutePath(String(input.route || ""));
  if (!route) {
    throw new Error(`Spec from ${sourceLabel} requires a non-empty "route".`);
  }

  const layout = String(input.layout || "stack").toLowerCase();
  if (!SUPPORTED_LAYOUTS.has(layout)) {
    throw new Error(
      `Invalid spec layout "${layout}" in ${sourceLabel}. Use stack, split, or grid.`
    );
  }

  if (!Array.isArray(input.sections) || input.sections.length === 0) {
    throw new Error(`Spec from ${sourceLabel} requires a non-empty "sections" array.`);
  }

  const sections = input.sections.map((section, index) => {
    if (!section || typeof section !== "object" || Array.isArray(section)) {
      throw new Error(`Section #${index + 1} in ${sourceLabel} must be an object.`);
    }

    const type = String(section.type || "").trim();
    if (!SUPPORTED_SECTION_TYPES.has(type)) {
      throw new Error(
        `Section #${index + 1} in ${sourceLabel} has unsupported type "${type}".`
      );
    }

    return {
      ...section,
      type,
      id: toSectionId(section.id || `${type}-${index + 1}`),
      title: section.title ? String(section.title) : undefined,
      description: section.description ? String(section.description) : undefined,
    };
  });

  return {
    kind,
    version,
    route,
    title: String(input.title || toTitleFromRoute(route)),
    description: String(input.description || "Generated composed page."),
    layout,
    sections,
  };
}

function resolveSpecContracts(spec, context) {
  const resolvedSections = spec.sections.map((section, index) =>
    resolveSection(section, {
      sectionIndex: index,
      analyticsAppDefault: context.analyticsAppDefault,
    })
  );

  return {
    ...spec,
    sections: resolvedSections,
  };
}

function resolveSection(section, context) {
  if (section.type === "crud-list") {
    const modelName = resolveModelName(section);
    const modelContract = resolveDatabaseContractModel(modelName);
    const routeSegment = pluralizeWord(kebabCase(modelName));
    const routePascal = toPascalCase(routeSegment);

    return {
      ...section,
      modelName,
      modelContract,
      routeSegment,
      routePascal,
      title: section.title || `${modelName} list`,
      description:
        section.description || `Browse and manage ${routeSegment}.`,
      pageSize: resolvePositiveNumber(section.pageSize, 25),
    };
  }

  if (
    section.type === "analytics-bar-chart" ||
    section.type === "analytics-line-chart" ||
    section.type === "analytics-table"
  ) {
    const modelName = resolveModelName(section);
    const analyticsApp = resolveAnalyticsApp(section, context.analyticsAppDefault);
    const analyticsContract = resolveAnalyticsContractModel({
      analyticsApp,
      modelName,
    });

    const defaultDimension = analyticsContract.dimensions[0] || "id";
    const defaultMeasure =
      analyticsContract.measures.find(
        (entry) => !analyticsContract.totals.includes(entry)
      ) ||
      analyticsContract.measures[0] ||
      "count";
    const defaultTimeDimension =
      analyticsContract.defaultTimeDimension ||
      analyticsContract.timeDimensions[0] ||
      "createdAt";

    return {
      ...section,
      modelName,
      analyticsApp,
      analyticsContract,
      routeSegment: analyticsContract.routeSegment,
      title:
        section.title ||
        (section.type === "analytics-table"
          ? `${modelName} analytics table`
          : `${modelName} analytics`),
      description:
        section.description ||
        `Cube: ${analyticsContract.cube}`,
      dimension: String(section.dimension || defaultDimension),
      measure: String(section.measure || defaultMeasure),
      timeDimension: String(section.timeDimension || defaultTimeDimension),
      limit: resolvePositiveNumber(section.limit, 12),
      granularity: normalizeGranularity(String(section.granularity || "day")),
    };
  }

  throw new Error(
    `Section "${section.id}" has unsupported type "${section.type}".`
  );
}

function createPageSource(spec) {
  const uiImports = new Set();
  const importLines = [];
  const crudImports = new Map();
  const analyticsImports = new Map();
  const sectionComponents = [];
  const sectionCalls = [];

  importLines.push('import * as React from "react";');

  spec.sections.forEach((section, index) => {
    const sectionIndex = index + 1;
    if (section.type === "crud-list") {
      uiImports.add("Button");
      uiImports.add("CrudList");
      uiImports.add("CrudTable");
      importLines.push('import Link from "next/link";');

      crudImports.set(section.routeSegment, {
        hookName: `use${section.routePascal}`,
        columnsName: `${toCamelCase(section.modelName)}TableColumns`,
      });

      const componentName = `ComposedSection${sectionIndex}${toPascalCase(section.id)}`;
      sectionComponents.push(
        createCrudListSectionComponent(componentName, section)
      );
      sectionCalls.push(`<${componentName} />`);
      return;
    }

    if (
      section.type === "analytics-bar-chart" ||
      section.type === "analytics-line-chart" ||
      section.type === "analytics-table"
    ) {
      if (section.type === "analytics-bar-chart") {
        uiImports.add("BarChartCard");
        uiImports.add("adaptCubeSingleSeriesCategorical");
      }
      if (section.type === "analytics-line-chart") {
        uiImports.add("LineChartCard");
        uiImports.add("adaptCubeTimeSeries");
      }
      if (section.type === "analytics-table") {
        uiImports.add("ChartCard");
        uiImports.add("Table");
        uiImports.add("TableBody");
        uiImports.add("TableCell");
        uiImports.add("TableHead");
        uiImports.add("TableHeader");
        uiImports.add("TableRow");
        uiImports.add("adaptCubeTableList");
      }

      const routeSegment = section.routeSegment;
      const source = analyticsImports.get(routeSegment) || {
        functions: new Set(),
        includeRowType: false,
      };
      if (
        section.type === "analytics-bar-chart" ||
        section.type === "analytics-table"
      ) {
        source.functions.add(`fetch${section.modelName}AnalyticsGrouped`);
      }
      if (section.type === "analytics-line-chart") {
        source.functions.add(`fetch${section.modelName}AnalyticsTimeSeries`);
      }
      source.includeRowType = true;
      analyticsImports.set(routeSegment, source);

      const componentName = `ComposedSection${sectionIndex}${toPascalCase(section.id)}`;
      sectionComponents.push(
        createAnalyticsSectionComponent(componentName, section)
      );
      sectionCalls.push(`<${componentName} />`);
      return;
    }
  });

  const dedupedImports = Array.from(new Set(importLines));

  if (uiImports.size > 0) {
    dedupedImports.push(
      `import { ${Array.from(uiImports).sort((left, right) => left.localeCompare(right)).join(
        ", "
      )} } from "@workspace/ui";`
    );
  }

  Array.from(crudImports.entries())
    .sort((left, right) => left[0].localeCompare(right[0]))
    .forEach(([routeSegment, meta]) => {
      dedupedImports.push(
        `import { ${meta.columnsName} } from "@/lib/${routeSegment}/config";`
      );
      dedupedImports.push(
        `import { ${meta.hookName} } from "@/lib/${routeSegment}/hooks";`
      );
    });

  Array.from(analyticsImports.entries())
    .sort((left, right) => left[0].localeCompare(right[0]))
    .forEach(([routeSegment, meta]) => {
      const imports = Array.from(meta.functions).sort((left, right) =>
        left.localeCompare(right)
      );
      if (meta.includeRowType) {
        imports.push("type AnalyticsRow");
      }
      dedupedImports.push(
        `import { ${imports.join(", ")} } from "@/lib/analytics/${routeSegment}/api";`
      );
    });

  const pageComponentName = `${toPascalCase(spec.route.split("/").slice(-1)[0]) || "Composed"}Page`;
  const layoutClass =
    spec.layout === "split"
      ? '"grid gap-6 lg:grid-cols-2"'
      : spec.layout === "grid"
        ? '"grid gap-6 md:grid-cols-2 xl:grid-cols-3"'
        : '"space-y-6"';

  return `${dedupedImports.join("\n")}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unable to load section data.";
}

function toLabel(value: string): string {
  return String(value)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\\s+/g, " ")
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

function parseNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value.replaceAll(",", "").trim());
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (typeof value === "boolean") return value ? 1 : 0;
  return 0;
}

${sectionComponents.join("\n\n")}

export default function ${pageComponentName}() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <div className="space-y-6">
        <header className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
            Composed page
          </p>
          <h1 className="text-3xl font-semibold">${escapeTemplateLiteral(spec.title)}</h1>
          <p className="text-muted-foreground">
            ${escapeTemplateLiteral(spec.description)}
          </p>
        </header>

        <section className={${layoutClass}}>
          ${sectionCalls.join("\n          ")}
        </section>
      </div>
    </main>
  );
}
`;
}

function createCrudListSectionComponent(componentName, section) {
  const routeSegment = section.routeSegment;
  const routePascal = section.routePascal;
  const hookName = `use${routePascal}`;
  const columnsName = `${toCamelCase(section.modelName)}TableColumns`;

  return `function ${componentName}() {
  const [pageNumber, setPageNumber] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(${section.pageSize});

  const query = ${hookName}({
    pageNumber,
    pageSize,
  });

  const rows = query.data?.data?.items ?? [];
  const pagination = query.data?.metadata ?? {
    pageNumber,
    pageSize,
    pageCount: 1,
    count: rows.length,
  };

  return (
    <CrudList
      title="${escapeTemplateLiteral(section.title)}"
      description="${escapeTemplateLiteral(section.description)}"
      isLoading={query.isLoading}
      error={query.error ? getErrorMessage(query.error) : null}
      isEmpty={rows.length === 0}
      actions={
        <Button asChild variant="outline" size="sm">
          <Link href="/${routeSegment}">Open ${section.modelName}</Link>
        </Button>
      }
    >
      <CrudTable
        rows={rows}
        columns={${columnsName}}
        pagination={pagination}
        onPageChange={setPageNumber}
        onPageSizeChange={(nextPageSize) => {
          setPageSize(nextPageSize);
          setPageNumber(1);
        }}
        isPageLoading={query.isFetching}
      />
    </CrudList>
  );
}`;
}

function createAnalyticsSectionComponent(componentName, section) {
  if (section.type === "analytics-bar-chart") {
    return `function ${componentName}() {
  const [rows, setRows] = React.useState<AnalyticsRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    fetch${section.modelName}AnalyticsGrouped({
      dimension: "${escapeTemplateLiteral(section.dimension)}",
      measure: "${escapeTemplateLiteral(section.measure)}",
      limit: ${section.limit},
    })
      .then((result) => {
        if (!active) return;
        setRows(result.rows ?? []);
      })
      .catch((nextError) => {
        if (!active) return;
        setError(getErrorMessage(nextError));
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const groupedChart = React.useMemo(
    () =>
      adaptCubeSingleSeriesCategorical(
        { rows },
        {
          dimensionKey: "${escapeTemplateLiteral(section.dimension)}",
          measureKey: "${escapeTemplateLiteral(section.measure)}",
          indexKey: "category",
          valueKey: "value",
          sortBy: "value",
          sortDirection: "desc",
        }
      ),
    [rows]
  );

  return (
    <BarChartCard
      title="${escapeTemplateLiteral(section.title)}"
      description={error || "${escapeTemplateLiteral(section.description)}"}
      data={groupedChart.data}
      index={groupedChart.indexKey}
      categories={groupedChart.categories}
      loading={loading}
      emptyLabel="No grouped data available."
      valueFormatter={(value) => Number(value).toLocaleString()}
    />
  );
}`;
  }

  if (section.type === "analytics-line-chart") {
    return `function ${componentName}() {
  const [rows, setRows] = React.useState<AnalyticsRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    fetch${section.modelName}AnalyticsTimeSeries({
      measure: "${escapeTemplateLiteral(section.measure)}",
      timeDimension: "${escapeTemplateLiteral(section.timeDimension)}",
      granularity: "${escapeTemplateLiteral(section.granularity)}",
    })
      .then((result) => {
        if (!active) return;
        setRows(result.rows ?? []);
      })
      .catch((nextError) => {
        if (!active) return;
        setError(getErrorMessage(nextError));
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const timeSeries = React.useMemo(
    () =>
      adaptCubeTimeSeries(
        { rows },
        {
          timeDimensionKey: "${escapeTemplateLiteral(section.timeDimension)}",
          measureKey: "${escapeTemplateLiteral(section.measure)}",
          indexKey: "bucket",
          valueKey: "value",
          granularity: "${escapeTemplateLiteral(section.granularity)}",
          sortDirection: "asc",
        }
      ),
    [rows]
  );

  return (
    <LineChartCard
      title="${escapeTemplateLiteral(section.title)}"
      description={error || "${escapeTemplateLiteral(section.description)}"}
      data={timeSeries.data}
      index={timeSeries.indexKey}
      categories={timeSeries.categories}
      loading={loading}
      emptyLabel="No time-series data available."
      valueFormatter={(value) => Number(value).toLocaleString()}
    />
  );
}`;
  }

  return `function ${componentName}() {
  const [rows, setRows] = React.useState<AnalyticsRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    fetch${section.modelName}AnalyticsGrouped({
      dimension: "${escapeTemplateLiteral(section.dimension)}",
      measure: "${escapeTemplateLiteral(section.measure)}",
      limit: ${section.limit},
    })
      .then((result) => {
        if (!active) return;
        setRows(result.rows ?? []);
      })
      .catch((nextError) => {
        if (!active) return;
        setError(getErrorMessage(nextError));
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const groupedTable = React.useMemo(
    () =>
      adaptCubeTableList(
        { rows },
        {
          columns: ["${escapeTemplateLiteral(section.dimension)}", "${escapeTemplateLiteral(section.measure)}"],
          numericColumns: ["${escapeTemplateLiteral(section.measure)}"],
          sortBy: "${escapeTemplateLiteral(section.measure)}",
          sortDirection: "desc",
          stringFallback: "-",
          numberFallback: 0,
        }
      ),
    [rows]
  );

  return (
    <ChartCard
      title="${escapeTemplateLiteral(section.title)}"
      description={error || "${escapeTemplateLiteral(section.description)}"}
    >
      <Table>
        <TableHeader>
          <TableRow>
            {groupedTable.columns.map((column) => (
              <TableHead key={column}>{toLabel(column)}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell
                colSpan={Math.max(groupedTable.columns.length, 1)}
                className="text-muted-foreground"
              >
                Loading...
              </TableCell>
            </TableRow>
          ) : groupedTable.rows.length ? (
            groupedTable.rows.slice(0, ${section.limit}).map((row, index) => (
              <TableRow key={index}>
                {groupedTable.columns.map((column) => (
                  <TableCell key={column + "-" + index}>
                    {String(row[column] ?? "-")}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={Math.max(groupedTable.columns.length, 1)}
                className="text-muted-foreground"
              >
                No grouped rows available.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </ChartCard>
  );
}`;
}

function resolveModelName(section) {
  const model =
    section.model ||
    section.modelName ||
    section.contractRef?.model;
  const normalized = toPascalCase(String(model || "").trim());
  if (!normalized) {
    throw new Error(
      `Section "${section.id}" requires a model (for example "User" or contractRef.model).`
    );
  }
  return normalized;
}

function resolveAnalyticsApp(section, analyticsAppDefault) {
  const value = section.analyticsApp || section.contractRef?.app || analyticsAppDefault;
  const normalized = String(value || "").trim();
  if (!normalized) {
    throw new Error(
      `Section "${section.id}" requires analytics app context (section.analyticsApp or --analytics-app).`
    );
  }
  return normalized;
}

function resolveDatabaseContractModel(modelName) {
  const contractsDir = path.join(repoRoot, "packages", "database", "contracts", "models");
  if (!fs.existsSync(contractsDir)) {
    throw new Error(
      "Database contracts directory not found at packages/database/contracts/models."
    );
  }

  const candidate = path.join(contractsDir, `${modelName}.model.ts`);
  if (!fs.existsSync(candidate)) {
    throw new Error(
      `Database contract not found for model ${modelName} at packages/database/contracts/models/${modelName}.model.ts`
    );
  }

  const source = fs.readFileSync(candidate, "utf8");
  const fields = parseClassFields(source, modelName);
  return {
    modelName,
    path: candidate,
    fields,
  };
}

function resolveAnalyticsContractModel({ analyticsApp, modelName }) {
  const contractsDir = path.join(
    repoRoot,
    "apps",
    analyticsApp,
    "src",
    "analytics",
    "contracts"
  );

  if (!fs.existsSync(contractsDir)) {
    throw new Error(
      `Analytics contracts directory not found at apps/${analyticsApp}/src/analytics/contracts.`
    );
  }

  const files = listFilesRecursively(contractsDir).filter((filePath) =>
    filePath.endsWith(".analytics.ts")
  );

  const parsedContracts = files.map((filePath) => {
    const source = fs.readFileSync(filePath, "utf8");
    return {
      ...parseAnalyticsContractSource(source, filePath),
      filePath,
    };
  });

  const normalizedModel = toPascalCase(modelName);
  const contract = parsedContracts.find((entry) => entry.modelName === normalizedModel);
  if (!contract) {
    throw new Error(
      `Analytics contract for model ${modelName} was not found in apps/${analyticsApp}/src/analytics/contracts.`
    );
  }

  return contract;
}

function parseClassFields(source, className) {
  const classPattern = new RegExp(`export\\s+class\\s+${escapeRegExp(className)}\\s*\\{([\\s\\S]*?)\\}`);
  const classMatch = source.match(classPattern);
  if (!classMatch) return [];

  const body = classMatch[1];
  const fieldPattern = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*[!?]?\??:\s*([^;]+);/gm;
  const fields = [];
  let match = fieldPattern.exec(body);
  while (match) {
    fields.push({
      name: match[1],
      type: String(match[2] || "unknown").trim(),
    });
    match = fieldPattern.exec(body);
  }

  return fields;
}

function listFilesRecursively(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) return listFilesRecursively(fullPath);
    return [fullPath];
  });
}

function toSectionId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toTitleFromRoute(route) {
  const leaf = route.split("/").slice(-1)[0] || route;
  return leaf
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeRoutePath(input) {
  return String(input || "")
    .split("/")
    .map((segment) => kebabCase(segment.trim()))
    .filter(Boolean)
    .join("/");
}

function resolvePositiveNumber(value, fallbackValue) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallbackValue;
  return Math.floor(parsed);
}

function normalizeGranularity(value) {
  const normalized = String(value || "day").toLowerCase();
  if (["hour", "day", "week", "month", "quarter", "year"].includes(normalized)) {
    return normalized;
  }
  return "day";
}

function hasNoAutoUpdateDirective(content) {
  return /^\s*\/\*_?\s*no-auto-update\s*_?\*\//.test(String(content || ""));
}

function writeFileRespectingDirective(targetPath, content, force) {
  if (fs.existsSync(targetPath)) {
    const current = fs.readFileSync(targetPath, "utf8");
    if (hasNoAutoUpdateDirective(current)) return;
    if (!force) return;
  }

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, content, "utf8");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeTemplateLiteral(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$\{/g, "\\${");
}

function toCamelCase(input) {
  return String(input)
    .replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ""))
    .replace(/^(.)/, (char) => char.toLowerCase());
}

function toPascalCase(input) {
  const camel = toCamelCase(input);
  return camel ? camel.charAt(0).toUpperCase() + camel.slice(1) : "";
}

function kebabCase(input) {
  return String(input || "")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[_\s]+/g, "-")
    .replace(/--+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function pluralizeWord(input) {
  if (!input) return "";
  if (/[^aeiou]y$/i.test(input)) {
    return `${input.slice(0, -1)}ies`;
  }
  if (/(s|x|z|ch|sh)$/i.test(input)) {
    return `${input}es`;
  }
  return `${input}s`;
}

if (require.main === module) {
  main();
}

module.exports = {
  createFallbackSpec,
  createPageSource,
  normalizeSpec,
  normalizeRoutePath,
  parseSpecFromFile,
  resolveAnalyticsContractModel,
  resolveDatabaseContractModel,
  resolvePresetPath,
  resolveSection,
  resolveSpecContracts,
  toSectionId,
  writeFileRespectingDirective,
};
