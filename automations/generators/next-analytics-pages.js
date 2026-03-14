#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { repoRoot, parseCliFlags } = require("./_shared/utils");

const GRANULARITY_VALUES = ["day", "week", "month", "quarter", "year"];

function main() {
  try {
    const flags = parseCliFlags({
      analyticsApp: "api",
      all: false,
      force: true,
      routeBase: "analytics",
      layout: "stacked",
      profile: "overview",
      defaultGrain: "day",
    });

    const appName = flags.app || flags.appName;
    const analyticsAppName = flags.analyticsApp || flags.sourceApp || "api";
    const modelsInput = flags.models || flags.model || flags.entity;
    const useAllModels = Boolean(flags.all);
    const force = Boolean(flags.force);
    const routeBase = normalizeRouteBase(flags.routeBase);
    const layout = normalizeLayout(flags.layout);
    const profile = normalizeProfile(flags.profile);
    const defaultGranularity = normalizeGranularity(flags.defaultGrain);

    if (!appName) {
      throw new Error('Provide a Next app name with "--app <name>".');
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

    const analyticsAppDir = path.join(repoRoot, "apps", analyticsAppName);
    if (!fs.existsSync(analyticsAppDir)) {
      throw new Error(`Analytics app not found at ${analyticsAppDir}`);
    }

    const analyticsSpecs = readAnalyticsContractSpecs(analyticsAppDir);
    if (!analyticsSpecs.length) {
      throw new Error(
        `No analytics contracts found in apps/${analyticsAppName}/src/analytics/contracts. Run cube-service-updator first.`
      );
    }

    const selectedSpecs = useAllModels
      ? analyticsSpecs
      : resolveRequestedSpecs(analyticsSpecs, modelsInput);

    if (!selectedSpecs.length) {
      throw new Error("No analytics contract specs were selected for generation.");
    }

    ensureAnalyticsScaffolding({
      appDir,
      force,
      routeBase,
      layout,
      profile,
    });

    selectedSpecs.forEach((spec) => {
      scaffoldAnalyticsPageForModel({
        appDir,
        spec,
        force,
        routeBase,
        defaultGranularity,
      });
    });

    upsertAnalyticsIndexPage({
      appDir,
      force,
      routeBase,
      selectedSpecs,
    });

    console.log(
      `[next-analytics-pages] Generated analytics pages for ${selectedSpecs
        .map((spec) => spec.modelName)
        .join(", ")} in apps/${appName} (contracts: apps/${analyticsAppName}/src/analytics/contracts)`
    );
  } catch (error) {
    console.error(`[next-analytics-pages] ${error.message}`);
    process.exit(1);
  }
}

function ensureAnalyticsScaffolding({ appDir, force, routeBase, layout, profile }) {
  const files = {
    "src/lib/analytics/client.ts": createAnalyticsClientFile(),
    "src/app/api/analytics/cube/route.ts": createCubeProxyRouteFile(),
    "src/lib/analytics/ui-config.ts": createAnalyticsUiConfigFile({
      routeBase,
      layout,
      profile,
    }),
  };

  Object.entries(files).forEach(([relativePath, content]) => {
    writeFileRespectingDirective(path.join(appDir, relativePath), content, force);
  });
}

function scaffoldAnalyticsPageForModel({
  appDir,
  spec,
  force,
  routeBase,
  defaultGranularity,
}) {
  const analyticsLibDir = path.join(appDir, "src", "lib", "analytics", spec.routeSegment);
  const analyticsPageDir = path.join(appDir, "src", "app", ...routeBase.split("/"), spec.routeSegment);

  const files = {
    [path.join(analyticsLibDir, "contract.ts")]: createModelContractFile(spec),
    [path.join(analyticsLibDir, "api.ts")]: createModelApiFile(spec),
    [path.join(analyticsPageDir, "page.tsx")]: createModelPageFile(
      spec,
      defaultGranularity
    ),
  };

  Object.entries(files).forEach(([targetPath, content]) => {
    writeFileRespectingDirective(targetPath, content, force);
  });
}

function upsertAnalyticsIndexPage({ appDir, force, routeBase, selectedSpecs }) {
  const indexPath = path.join(appDir, "src", "app", ...routeBase.split("/"), "page.tsx");
  const existingRoutes = fs.existsSync(indexPath)
    ? readExistingRouteEntries(fs.readFileSync(indexPath, "utf8"), routeBase)
    : [];

  const entriesBySegment = new Map(
    existingRoutes.map((entry) => [entry.segment, entry])
  );

  selectedSpecs.forEach((spec) => {
    entriesBySegment.set(spec.routeSegment, {
      segment: spec.routeSegment,
      modelName: spec.modelName,
      cube: spec.cube,
    });
  });

  const entries = Array.from(entriesBySegment.values()).sort((left, right) =>
    left.modelName.localeCompare(right.modelName)
  );

  writeFileRespectingDirective(indexPath, createAnalyticsIndexPageFile(entries, routeBase), force);
}

function readExistingRouteEntries(content, routeBase) {
  const entries = [];
  const routePattern = new RegExp(`href="/${escapeRegExp(routeBase)}/([^"]+)"`, "g");
  let match = routePattern.exec(content);

  while (match) {
    const segment = String(match[1]).trim();
    if (segment) {
      entries.push({
        segment,
        modelName: toPascalCase(segment.replace(/-/g, " ")),
        cube: toPascalCase(segment.replace(/-/g, " ")),
      });
    }
    match = routePattern.exec(content);
  }

  return entries;
}

function createAnalyticsIndexPageFile(entries, routeBase) {
  const serializedEntries = JSON.stringify(
    entries.map((entry) => ({
      href: `/${routeBase}/${entry.segment}`,
      modelName: entry.modelName,
      cube: entry.cube,
    })),
    null,
    2
  );

  return `import Link from "next/link";

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui";

import { analyticsUiConfig } from "@/lib/analytics/ui-config";

const analyticsPages = ${serializedEntries};

export default function AnalyticsIndexPage() {
  return (
    <main className={analyticsUiConfig.containerClassName}>
      <div className={analyticsUiConfig.contentClassName}>
        <header className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
            Analytics
          </p>
          <h1 className="text-3xl font-semibold">Analytics Pages</h1>
          <p className="text-muted-foreground">
            Generated analytics surfaces backed by typed contracts.
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {analyticsPages.map((page) => (
            <Card key={page.href}>
              <CardHeader className="space-y-1">
                <CardTitle className="text-base">{page.modelName}</CardTitle>
                <CardDescription>Cube: {page.cube}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild size="sm">
                  <Link href={page.href}>Open page</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
    </main>
  );
}
`;
}

function createAnalyticsClientFile() {
  return `import type { Granularity } from "@workspace/ui";

export type AnalyticsScalar = string | number | boolean | null;

export type CubeOrder = "asc" | "desc";
export type CubeFilterOperator =
  | "equals"
  | "notEquals"
  | "contains"
  | "notContains"
  | "startsWith"
  | "endsWith"
  | "inDateRange"
  | "set"
  | "notSet";

export type CubeQueryFilter = {
  member: string;
  operator: CubeFilterOperator;
  values?: string[];
};

export type CubeTimeDimension = {
  dimension: string;
  granularity?: Granularity;
  dateRange?: [string, string];
};

export type CubeQuery = {
  measures?: string[];
  dimensions?: string[];
  timeDimensions?: CubeTimeDimension[];
  filters?: CubeQueryFilter[];
  order?: Record<string, CubeOrder>;
  limit?: number;
};

export type CubeLoadResult = {
  data?: Array<Record<string, AnalyticsScalar>>;
  annotation?: Record<string, unknown>;
  query?: Record<string, unknown>;
};

export type CubeLoadResponse = CubeLoadResult & {
  results?: CubeLoadResult[];
  error?: string;
};

export async function requestCubeLoad(query: CubeQuery): Promise<CubeLoadResponse> {
  const response = await fetch("/api/analytics/cube", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(
      "[analytics] Cube load request failed (" +
        response.status +
        " " +
        response.statusText +
        "): " +
        payload
    );
  }

  return (await response.json()) as CubeLoadResponse;
}
`;
}

function createCubeProxyRouteFile() {
  return `import { NextResponse } from "next/server";

type CubeProxyBody = {
  query?: Record<string, unknown>;
};

function resolveCubeApiBaseUrl() {
  return (
    process.env.CUBE_API_URL ||
    process.env.NEXT_PUBLIC_CUBE_API_URL ||
    "http://localhost:4000"
  );
}

export async function POST(request: Request) {
  let body: CubeProxyBody | null = null;

  try {
    body = (await request.json()) as CubeProxyBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body. Expected { query: {...} }." },
      { status: 400 }
    );
  }

  if (!body?.query || typeof body.query !== "object") {
    return NextResponse.json(
      { error: 'Missing "query" payload. Expected { query: {...} }.' },
      { status: 400 }
    );
  }

  const cubeApiBaseUrl = resolveCubeApiBaseUrl().replace(/\\/+$/, "");
  const cubeApiUrl = cubeApiBaseUrl + "/cubejs-api/v1/load";
  const cubeApiToken = process.env.CUBE_API_TOKEN || "";

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (cubeApiToken) {
    headers.Authorization = "Bearer " + cubeApiToken;
  }

  let response: Response;
  try {
    response = await fetch(cubeApiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ query: body.query }),
      cache: "no-store",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to reach Cube API.";
    return NextResponse.json(
      {
        error: "Cube API request failed.",
        details: message,
      },
      { status: 502 }
    );
  }

  const payloadText = await response.text();
  let payload: unknown;
  try {
    payload = payloadText ? JSON.parse(payloadText) : {};
  } catch {
    payload = { raw: payloadText };
  }

  if (!response.ok) {
    return NextResponse.json(
      {
        error: "Cube API returned a non-success response.",
        status: response.status,
        details: payload,
      },
      { status: response.status }
    );
  }

  return NextResponse.json(payload);
}
`;
}

function createAnalyticsUiConfigFile({ routeBase, layout, profile }) {
  const contentClassName =
    layout === "split"
      ? "space-y-8"
      : "space-y-6";

  return `export const analyticsUiConfig = {
  routeBase: "${routeBase}",
  layout: "${layout}",
  profile: "${profile}",
  containerClassName: "mx-auto w-full max-w-7xl px-4 py-8 sm:px-6",
  contentClassName: "${contentClassName}",
};
`;
}

function createModelContractFile(spec) {
  return `export const ${spec.contractName} = {
  cube: "${spec.cube}",
  dimensions: [${asQuotedList(spec.dimensions)}],
  measures: [${asQuotedList(spec.measures)}],
  totals: [${asQuotedList(spec.totals)}],
  timeDimensions: [${asQuotedList(spec.timeDimensions)}],
  defaultTimeDimension: ${spec.defaultTimeDimension ? `"${spec.defaultTimeDimension}"` : "undefined"},
  scopedFilters: [${asQuotedList(spec.scopedFilters)}],
} as const;

export type ${spec.modelName}AnalyticsDimension =
  (typeof ${spec.contractName}.dimensions)[number];
export type ${spec.modelName}AnalyticsMeasure =
  (typeof ${spec.contractName}.measures)[number];
export type ${spec.modelName}AnalyticsTimeDimension =
  (typeof ${spec.contractName}.timeDimensions)[number];
`;
}

function createModelApiFile(spec) {
  const functionBase = `${spec.modelName}Analytics`;

  return `import type { Granularity } from "@workspace/ui";

import {
  requestCubeLoad,
  type CubeLoadResponse,
  type CubeQuery,
  type CubeQueryFilter,
} from "@/lib/analytics/client";

import { ${spec.contractName} } from "./contract";

export type AnalyticsScalar = string | number | boolean | null;
export type AnalyticsRow = Record<string, AnalyticsScalar>;

export type AnalyticsResponse = {
  rows: AnalyticsRow[];
  meta?: Record<string, unknown>;
};

type ScopeFilters = Record<string, AnalyticsScalar | undefined>;

type ${functionBase}Options = {
  dimension?: string;
  measure?: string;
  timeDimension?: string;
  granularity?: Granularity;
  limit?: number;
  from?: string;
  to?: string;
  scope?: ScopeFilters;
};

function toMember(field: string): string {
  return ${spec.contractName}.cube + "." + field;
}

function toScopeFilters(scope?: ScopeFilters): CubeQueryFilter[] {
  const scopedFilters = ${spec.contractName}.scopedFilters;
  if (!scope || !scopedFilters.length) return [];

  return (
    scopedFilters
      .map((field) => [field, scope[field]] as const)
      .filter(([, value]) => value !== undefined && value !== null && value !== "")
      .map(([field, value]) => ({
        member: toMember(field),
        operator: "equals",
        values: [String(value)],
      }))
  );
}

function normalizeCubeMemberKey(key: string): string {
  const allMembers = [
    ...${spec.contractName}.dimensions,
    ...${spec.contractName}.measures,
    ...${spec.contractName}.timeDimensions,
  ];

  for (const member of allMembers) {
    const exact = toMember(member);
    if (key === exact) return member;
    if (key.startsWith(exact + ".")) return member;
  }

  if (key.startsWith(${spec.contractName}.cube + ".")) {
    return key.slice(${spec.contractName}.cube.length + 1).replace(/\\./g, "_");
  }

  return key;
}

function normalizeRows(rows: AnalyticsRow[]): AnalyticsRow[] {
  return rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [normalizeCubeMemberKey(key), value])
    )
  );
}

function toRows(response: CubeLoadResponse): AnalyticsRow[] {
  const fromRoot = Array.isArray(response.data) ? response.data : null;
  if (fromRoot) return normalizeRows(fromRoot as AnalyticsRow[]);

  const firstResult = Array.isArray(response.results) ? response.results[0] : null;
  if (firstResult && Array.isArray(firstResult.data)) {
    return normalizeRows(firstResult.data as AnalyticsRow[]);
  }

  return [];
}

function toMeta(response: CubeLoadResponse): Record<string, unknown> {
  const firstResult = Array.isArray(response.results) ? response.results[0] : undefined;
  return {
    query: response.query ?? firstResult?.query,
    annotation: response.annotation ?? firstResult?.annotation,
  };
}

export async function fetch${functionBase}Summary(
  options: ${functionBase}Options = {}
): Promise<AnalyticsResponse> {
  const totals = ${spec.contractName}.totals.length
    ? ${spec.contractName}.totals
    : ${spec.contractName}.measures;
  const query: CubeQuery = {
    measures: totals.map(toMember),
    filters: toScopeFilters(options.scope),
  };
  const response = await requestCubeLoad(query);

  return {
    rows: toRows(response),
    meta: toMeta(response),
  };
}

export async function fetch${functionBase}Grouped(
  options: ${functionBase}Options = {}
): Promise<AnalyticsResponse> {
  const dimension =
    options.dimension ?? ${spec.contractName}.dimensions[0] ?? "id";
  const measure =
    options.measure ??
    ${spec.contractName}.measures.find(
      (entry) => !${spec.contractName}.totals.includes(entry)
    ) ??
    ${spec.contractName}.measures[0] ??
    "count";
  const query: CubeQuery = {
    dimensions: [toMember(dimension)],
    measures: [toMember(measure)],
    filters: toScopeFilters(options.scope),
    order: {
      [toMember(measure)]: "desc",
    },
    limit: options.limit ?? 12,
  };
  const response = await requestCubeLoad(query);

  return {
    rows: toRows(response),
    meta: toMeta(response),
  };
}

export async function fetch${functionBase}TimeSeries(
  options: ${functionBase}Options = {}
): Promise<AnalyticsResponse> {
  const measure =
    options.measure ??
    ${spec.contractName}.measures.find(
      (entry) => !${spec.contractName}.totals.includes(entry)
    ) ??
    ${spec.contractName}.measures[0] ??
    "count";
  const timeDimension =
    options.timeDimension ??
    ${spec.contractName}.defaultTimeDimension ??
    ${spec.contractName}.timeDimensions[0] ??
    "createdAt";
  const query: CubeQuery = {
    measures: [toMember(measure)],
    timeDimensions: [
      {
        dimension: toMember(timeDimension),
        granularity: options.granularity ?? "day",
        ...(options.from && options.to
          ? { dateRange: [options.from, options.to] as [string, string] }
          : {}),
      },
    ],
    filters: toScopeFilters(options.scope),
    order: {
      [toMember(timeDimension)]: "asc",
    },
  };
  const response = await requestCubeLoad(query);

  return {
    rows: toRows(response),
    meta: toMeta(response),
  };
}
`;
}

function createModelPageFile(spec, defaultGranularity) {
  const functionBase = `${spec.modelName}Analytics`;
  const defaultDimension = spec.dimensions[0] || "id";
  const defaultMeasure =
    spec.measures.find((entry) => !spec.totals.includes(entry)) ||
    spec.measures[0] ||
    "count";
  const defaultTimeDimension = spec.defaultTimeDimension || spec.timeDimensions[0] || "createdAt";
  const routePath = `/\${analyticsUiConfig.routeBase}/${spec.routeSegment}`;

  return `"use client";

import * as React from "react";
import Link from "next/link";

import {
  BarChartCard,
  Button,
  ChartCard,
  DataBars,
  LineChartCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  adaptCubeSingleSeriesCategorical,
  adaptCubeTableList,
  adaptCubeTimeSeries,
  toNameValuePairs,
  type Granularity,
} from "@workspace/ui";

import { analyticsUiConfig } from "@/lib/analytics/ui-config";
import {
  fetch${functionBase}Grouped,
  fetch${functionBase}Summary,
  fetch${functionBase}TimeSeries,
  type AnalyticsRow,
} from "@/lib/analytics/${spec.routeSegment}/api";
import { ${spec.contractName} } from "@/lib/analytics/${spec.routeSegment}/contract";

const GRANULARITY_OPTIONS = ["day", "week", "month", "quarter", "year"] as const;
type SupportedGranularity = (typeof GRANULARITY_OPTIONS)[number];

type LoadState = {
  summaryRows: AnalyticsRow[];
  groupedRows: AnalyticsRow[];
  timeRows: AnalyticsRow[];
  loading: boolean;
  error: string | null;
};

const DEFAULT_DIMENSION = "${defaultDimension}";
const DEFAULT_MEASURE = "${defaultMeasure}";
const DEFAULT_TIME_DIMENSION = "${defaultTimeDimension}";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unable to load analytics data.";
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

function toLabel(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\\s+/g, " ")
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

function normalizeSummaryRows(rows: AnalyticsRow[], fallbackMeasures: readonly string[]) {
  if (!rows.length) {
    return fallbackMeasures.slice(0, 6).map((measure) => ({
      name: toLabel(measure),
      value: 0,
    }));
  }

  const first = rows[0] || {};
  if ("name" in first && "value" in first) {
    return rows.map((row) => ({
      name: String(row.name ?? ""),
      value: parseNumber(row.value),
    }));
  }

  return fallbackMeasures.slice(0, 6).map((measure) => ({
    name: toLabel(measure),
    value: parseNumber(first[measure]),
  }));
}

function isGranularity(value: string): value is SupportedGranularity {
  return GRANULARITY_OPTIONS.includes(value as SupportedGranularity);
}

export default function ${spec.modelName}AnalyticsPage() {
  const [granularity, setGranularity] = React.useState<SupportedGranularity>(
    "${defaultGranularity}"
  );
  const [state, setState] = React.useState<LoadState>({
    summaryRows: [],
    groupedRows: [],
    timeRows: [],
    loading: true,
    error: null,
  });

  const dimension = ${spec.contractName}.dimensions[0] ?? DEFAULT_DIMENSION;
  const measure =
    ${spec.contractName}.measures.find(
      (entry) => !${spec.contractName}.totals.includes(entry)
    ) ??
    ${spec.contractName}.measures[0] ??
    DEFAULT_MEASURE;
  const timeDimension =
    ${spec.contractName}.defaultTimeDimension ??
    ${spec.contractName}.timeDimensions[0] ??
    DEFAULT_TIME_DIMENSION;

  React.useEffect(() => {
    let active = true;

    setState((current) => ({
      ...current,
      loading: true,
      error: null,
    }));

    Promise.all([
      fetch${functionBase}Summary(),
      fetch${functionBase}Grouped({
        dimension,
        measure,
        limit: 12,
      }),
      fetch${functionBase}TimeSeries({
        measure,
        timeDimension,
        granularity: granularity as Granularity,
      }),
    ])
      .then(([summary, grouped, timeSeries]) => {
        if (!active) return;
        setState({
          summaryRows: summary.rows ?? [],
          groupedRows: grouped.rows ?? [],
          timeRows: timeSeries.rows ?? [],
          loading: false,
          error: null,
        });
      })
      .catch((error) => {
        if (!active) return;
        setState((current) => ({
          ...current,
          loading: false,
          error: getErrorMessage(error),
        }));
      });

    return () => {
      active = false;
    };
  }, [dimension, granularity, measure, timeDimension]);

  const summaryPairs = React.useMemo(() => {
    const normalized = normalizeSummaryRows(state.summaryRows, ${spec.contractName}.totals);
    const summaryResult = adaptCubeSingleSeriesCategorical(
      {
        rows: normalized,
      },
      {
        dimensionKey: "name",
        measureKey: "value",
        indexKey: "name",
        valueKey: "value",
        sortBy: "value",
        sortDirection: "desc",
      }
    );
    return toNameValuePairs(summaryResult);
  }, [state.summaryRows]);

  const groupedChart = React.useMemo(
    () =>
      adaptCubeSingleSeriesCategorical(
        { rows: state.groupedRows },
        {
          dimensionKey: dimension,
          measureKey: measure,
          indexKey: "category",
          valueKey: "value",
          sortBy: "value",
          sortDirection: "desc",
        }
      ),
    [dimension, measure, state.groupedRows]
  );

  const groupedTable = React.useMemo(
    () =>
      adaptCubeTableList(
        { rows: state.groupedRows },
        {
          columns: [dimension, measure],
          numericColumns: [measure],
          sortBy: measure,
          sortDirection: "desc",
          stringFallback: "-",
          numberFallback: 0,
        }
      ),
    [dimension, measure, state.groupedRows]
  );

  const timeSeries = React.useMemo(
    () =>
      adaptCubeTimeSeries(
        { rows: state.timeRows },
        {
          timeDimensionKey: timeDimension,
          measureKey: measure,
          indexKey: "bucket",
          valueKey: "value",
          granularity: granularity as Granularity,
          sortDirection: "asc",
        }
      ),
    [granularity, measure, state.timeRows, timeDimension]
  );

  const splitLayout = analyticsUiConfig.layout === "split";

  return (
    <main className={analyticsUiConfig.containerClassName}>
      <div className={analyticsUiConfig.contentClassName}>
        <header className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                Analytics
              </p>
              <h1 className="text-3xl font-semibold">${spec.modelName} Analytics</h1>
              <p className="text-muted-foreground">
                Cube: ${spec.cube}
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href={"/" + analyticsUiConfig.routeBase}>All analytics pages</Link>
            </Button>
          </div>
          {state.error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          ) : null}
        </header>

        <DataBars
          title="KPI totals"
          description="High-level totals derived from the analytics contract."
          data={summaryPairs}
          loading={state.loading}
          emptyLabel="No KPI totals available"
          valueFormatter={(value) => Number(value).toLocaleString()}
        />

        <section className={splitLayout ? "grid gap-6 xl:grid-cols-2" : "space-y-6"}>
          <BarChartCard
            title="Grouped breakdown"
            description={"Dimension: " + dimension + " · Measure: " + measure}
            data={groupedChart.data}
            index={groupedChart.indexKey}
            categories={groupedChart.categories}
            loading={state.loading}
            emptyLabel="No grouped data available"
            valueFormatter={(value) => Number(value).toLocaleString()}
          />

          <ChartCard
            title="Grouped table"
            description="Tabular view of grouped analytics results."
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
                {groupedTable.rows.length ? (
                  groupedTable.rows.slice(0, 12).map((row, index) => (
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
        </section>

        <LineChartCard
          title="Time series"
          description={"Time dimension: " + timeDimension + " · Measure: " + measure}
          data={timeSeries.data}
          index={timeSeries.indexKey}
          categories={timeSeries.categories}
          loading={state.loading}
          emptyLabel="No time-series data available"
          valueFormatter={(value) => Number(value).toLocaleString()}
          actions={
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Granularity</span>
              <select
                className="rounded-md border bg-background px-2 py-1 text-xs"
                value={granularity}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  if (isGranularity(value)) setGranularity(value);
                }}
              >
                {GRANULARITY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {toLabel(option)}
                  </option>
                ))}
              </select>
            </label>
          }
        />
      </div>
    </main>
  );
}
`;
}

function resolveRequestedSpecs(analyticsSpecs, modelsInput) {
  const modelNames = parseCsvList(modelsInput).map((model) => toPascalCase(model));
  if (!modelNames.length) return [];

  return modelNames.map((modelName) => {
    const found = analyticsSpecs.find(
      (spec) =>
        spec.modelName === modelName ||
        spec.modelSlug === kebabCase(modelName) ||
        spec.routeSegment === pluralizeWord(kebabCase(modelName))
    );

    if (!found) {
      throw new Error(
        `Analytics contract for model ${modelName} was not found. Run cube-service-updator for that model in the analytics app first.`
      );
    }

    return found;
  });
}

function readAnalyticsContractSpecs(analyticsAppDir) {
  const contractsDir = path.join(analyticsAppDir, "src", "analytics", "contracts");
  if (!fs.existsSync(contractsDir)) return [];

  const files = walkDir(contractsDir)
    .filter((filePath) => filePath.endsWith(".analytics.ts"))
    .sort((left, right) => left.localeCompare(right));

  return files.map((filePath) => {
    const source = fs.readFileSync(filePath, "utf8");
    return parseAnalyticsContractSource(source, filePath);
  });
}

function parseAnalyticsContractSource(source, filePath = "") {
  const contractNameMatch = source.match(
    /export\s+const\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?::\s*AnalyticsQueryContract)?\s*=\s*\{/
  );
  const contractName = contractNameMatch ? contractNameMatch[1] : "analyticsContract";

  const inferredModelName = toPascalCase(
    contractName.replace(/analyticscontract$/i, "") ||
      path.basename(filePath || "model", ".analytics.ts")
  );
  const modelName = inferredModelName || "Model";
  const modelSlug = kebabCase(modelName);

  const cubeMatch = source.match(/\bcube\s*:\s*"([^"]+)"/);
  const cube = cubeMatch ? cubeMatch[1] : pluralizeWord(toPascalCase(modelName));

  const dimensions = parseStringArrayProperty(source, "dimensions");
  const measures = parseStringArrayProperty(source, "measures");
  const totals = parseStringArrayProperty(source, "totals");
  const timeDimensions = parseStringArrayProperty(source, "timeDimensions");
  const scopedFilters = parseStringArrayProperty(source, "scopedFilters");

  const defaultTimeDimensionMatch = source.match(
    /\bdefaultTimeDimension\s*:\s*"([^"]+)"/
  );
  const defaultTimeDimension = defaultTimeDimensionMatch
    ? defaultTimeDimensionMatch[1]
    : null;

  return {
    modelName,
    modelSlug,
    routeSegment: pluralizeWord(modelSlug),
    contractName,
    cube,
    dimensions,
    measures,
    totals,
    timeDimensions,
    defaultTimeDimension,
    scopedFilters,
  };
}

function parseStringArrayProperty(source, propertyName) {
  const pattern = new RegExp(`\\b${escapeRegExp(propertyName)}\\s*:\\s*\\[([\\s\\S]*?)\\]`, "m");
  const match = source.match(pattern);
  if (!match) return [];

  const values = [];
  const valuePattern = /"([^"]+)"/g;
  let valueMatch = valuePattern.exec(match[1]);

  while (valueMatch) {
    values.push(valueMatch[1]);
    valueMatch = valuePattern.exec(match[1]);
  }

  return values;
}

function normalizeLayout(input) {
  const normalized = String(input || "stacked").toLowerCase();
  if (["stacked", "split"].includes(normalized)) return normalized;
  throw new Error('Invalid --layout value. Use "stacked" or "split".');
}

function normalizeProfile(input) {
  const normalized = String(input || "overview").toLowerCase();
  if (["overview", "operations", "executive"].includes(normalized)) return normalized;
  throw new Error(
    'Invalid --profile value. Use "overview", "operations", or "executive".'
  );
}

function normalizeGranularity(input) {
  const normalized = String(input || "day").toLowerCase();
  if (GRANULARITY_VALUES.includes(normalized)) return normalized;
  throw new Error(
    'Invalid --default-grain value. Use "day", "week", "month", "quarter", or "year".'
  );
}

function normalizeRouteBase(input) {
  const normalized = String(input || "analytics")
    .split("/")
    .map((segment) => kebabCase(segment.trim()))
    .filter(Boolean)
    .join("/");

  if (!normalized) {
    throw new Error('Invalid --route-base value. Provide a non-empty path segment.');
  }

  return normalized;
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

function asQuotedList(values) {
  return values.map((value) => `"${value}"`).join(", ");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toCamelCase(input) {
  return String(input || "")
    .replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ""))
    .replace(/^(.)/, (char) => char.toLowerCase());
}

function toPascalCase(input) {
  const camel = toCamelCase(input);
  return camel ? camel[0].toUpperCase() + camel.slice(1) : "";
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
  main,
  createAnalyticsClientFile,
  createCubeProxyRouteFile,
  createModelApiFile,
  parseStringArrayProperty,
  parseAnalyticsContractSource,
  readAnalyticsContractSpecs,
  resolveRequestedSpecs,
  normalizeLayout,
  normalizeProfile,
  normalizeGranularity,
  normalizeRouteBase,
  writeFileRespectingDirective,
  hasNoAutoUpdateDirective,
  toCamelCase,
  toPascalCase,
  kebabCase,
  pluralizeWord,
};
