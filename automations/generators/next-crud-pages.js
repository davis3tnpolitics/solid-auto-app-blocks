#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { repoRoot, parseCliFlags } = require("./_shared/utils");

const ts = loadTypeScript();

function main() {
  try {
    const flags = parseCliFlags({
      all: false,
      force: true,
      uiPreset: "default",
      layout: "table",
      listMode: "table",
      formStyle: "stacked",
    });

    const appName = flags.app || flags.appName;
    const modelsInput = flags.models || flags.model || flags.entity;
    const useAllModels = Boolean(flags.all);

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

    const models = useAllModels
      ? readAllPrismaModelNames()
      : String(modelsInput)
          .split(",")
          .map((value) => toPascalCase(value))
          .filter(Boolean);

    if (!models.length) {
      throw new Error("No models found for generation.");
    }

    ensureAppDependencies(appDir);
    ensureApiScaffolding({
      appDir,
      force: Boolean(flags.force),
      uiPreset: normalizeUiPreset(flags.uiPreset),
      layout: normalizeLayout(flags.layout),
      listMode: normalizeListMode(flags.listMode),
      formStyle: normalizeFormStyle(flags.formStyle),
      themeTokenFile: flags.themeTokenFile,
    });

    models.forEach((modelName) => {
      scaffoldCrudForModel({
        appDir,
        modelName,
        force: Boolean(flags.force),
      });
    });

    console.log(
      `[next-crud-pages] Generated CRUD hooks/pages for ${models.join(", ")} in apps/${appName}`
    );
  } catch (error) {
    console.error(`[next-crud-pages] ${error.message}`);
    process.exit(1);
  }
}

function loadTypeScript() {
  const candidates = [
    "typescript",
    path.join(repoRoot, "packages", "config", "node_modules", "typescript"),
    path.join(repoRoot, "packages", "database", "node_modules", "typescript"),
    path.join(repoRoot, "packages", "ui", "node_modules", "typescript"),
  ];

  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch {
      continue;
    }
  }

  throw new Error('Could not resolve "typescript" for next-crud-pages. Run "pnpm install".');
}

function ensureAppDependencies(appDir) {
  const packageJsonPath = path.join(appDir, "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error(`Missing package.json at ${packageJsonPath}`);
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  packageJson.dependencies = {
    ...(packageJson.dependencies || {}),
    "@tanstack/react-query": packageJson.dependencies?.["@tanstack/react-query"] || "^5.90.5",
    axios: packageJson.dependencies?.axios || "^1.13.2",
    zod: packageJson.dependencies?.zod || "^4.3.5",
  };

  fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");
}

function ensureApiScaffolding({
  appDir,
  force,
  uiPreset,
  layout,
  listMode,
  formStyle,
  themeTokenFile,
}) {
  const files = {
    "src/lib/api/client.ts": createApiClientFile(),
    "src/lib/api/query-client.ts": createQueryClientFile(),
    "src/app/providers.tsx": createProvidersFile(),
    "src/lib/crud/ui-config.ts": createCrudUiConfigFile({
      uiPreset,
      layout,
      listMode,
      formStyle,
      themeImportPath: resolveThemeImportPath(themeTokenFile),
    }),
  };

  Object.entries(files).forEach(([relativePath, content]) => {
    const targetPath = path.join(appDir, relativePath);
    writeFileRespectingDirective(targetPath, content, force);
  });

  if (themeTokenFile) {
    const themeFilePath = path.join(appDir, themeTokenFile);
    const themeContent = `export const crudThemeTokens = {
  container: "",
  content: "",
};
`;
    writeFileRespectingDirective(themeFilePath, themeContent, force);
  }

  ensureLayoutUsesProviders(appDir);
}

function createApiClientFile() {
  return `import axios from "axios";

import { appEnv } from "@/lib/env";

export const apiClient = axios.create({
  baseURL: appEnv.apiBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);
`;
}

function createQueryClientFile() {
  return `import { QueryClient } from "@tanstack/react-query";

let queryClient: QueryClient | undefined;

export function getQueryClient(): QueryClient {
  if (!queryClient) {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 30_000,
          refetchOnWindowFocus: false,
        },
        mutations: {
          retry: 1,
        },
      },
    });
  }

  return queryClient;
}
`;
}

function createProvidersFile() {
  return `"use client";

import * as React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";

import { getQueryClient } from "@/lib/api/query-client";

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = React.useState(() => getQueryClient());

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
`;
}

function createCrudUiConfigFile({ uiPreset, layout, listMode, formStyle, themeImportPath }) {
  const importLine = themeImportPath
    ? `import { crudThemeTokens } from "${themeImportPath}";\n\n`
    : "";
  const containerClassName = themeImportPath
    ? "`mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 ${crudThemeTokens.container ?? \"\"}`"
    : "\"mx-auto w-full max-w-6xl px-4 py-8 sm:px-6\"";
  const contentClassName = themeImportPath
    ? "`space-y-6 ${crudThemeTokens.content ?? \"\"}`"
    : "\"space-y-6\"";

  return `${importLine}export const crudUiConfig = {
  uiPreset: "${uiPreset}",
  layout: "${layout}",
  listMode: "${listMode}",
  formStyle: "${formStyle}",
  containerClassName: ${containerClassName},
  contentClassName: ${contentClassName},
};
`;
}

function resolveThemeImportPath(themeTokenFile) {
  if (!themeTokenFile) return null;

  const normalized = String(themeTokenFile).replace(/\\/g, "/");
  if (!normalized.startsWith("src/")) return null;

  return `@/${normalized.slice(4).replace(/\.tsx?$/, "")}`;
}

function ensureLayoutUsesProviders(appDir) {
  const layoutPath = path.join(appDir, "src", "app", "layout.tsx");
  if (!fs.existsSync(layoutPath)) return;

  const current = fs.readFileSync(layoutPath, "utf8");
  if (current.includes("AppProviders")) return;

  let updated = current;
  if (!updated.includes('import { AppProviders } from "@/app/providers";')) {
    updated = `import { AppProviders } from "@/app/providers";\n${updated}`;
  }

  const bodyPattern = /<body([^>]*)>\s*{children}\s*<\/body>/m;
  if (bodyPattern.test(updated)) {
    updated = updated.replace(
      bodyPattern,
      "<body$1><AppProviders>{children}</AppProviders></body>"
    );
  }

  if (updated !== current) {
    fs.writeFileSync(layoutPath, updated, "utf8");
  }
}

function scaffoldCrudForModel({ appDir, modelName, force }) {
  const routeSegment = pluralizeWord(kebabCase(modelName));
  const modelCamel = toCamelCase(modelName);
  const modelLower = modelName.charAt(0).toLowerCase() + modelName.slice(1);
  const routePascal = toPascalCase(routeSegment);

  const fields = readContractFields(modelName).map((field) => ({
    ...field,
    analysis: analyzeFieldType(field.type),
  }));

  const editableFields = fields.filter(
    (field) =>
      ["string", "number", "boolean", "date"].includes(field.analysis.kind) &&
      !["id", "createdAt", "updatedAt"].includes(field.name)
  );

  const tableFields = fields
    .filter((field) => ["string", "number", "boolean", "date"].includes(field.analysis.kind))
    .slice(0, 5);

  const detailFields = fields.filter((field) =>
    ["string", "number", "boolean", "date"].includes(field.analysis.kind)
  );

  const baseDir = path.join(appDir, "src", "lib", routeSegment);
  const pageDir = path.join(appDir, "src", "app", routeSegment);

  const files = {
    [path.join(baseDir, "types.ts")]: createTypesFile({ modelName, fields, editableFields, routePascal }),
    [path.join(baseDir, "api.ts")]: createApiFile({
      modelName,
      routeSegment,
      routePascal,
    }),
    [path.join(baseDir, "query-keys.ts")]: createQueryKeysFile({
      routeSegment,
      routePascal,
    }),
    [path.join(baseDir, "hooks.ts")]: createHooksFile({
      modelName,
      routeSegment,
      routePascal,
    }),
    [path.join(baseDir, "overrides.ts")]: createOverridesFile({
      modelName,
      modelCamel,
      editableFields,
    }),
    [path.join(baseDir, "config.ts")]: createConfigFile({
      modelName,
      modelCamel,
      editableFields,
      tableFields,
      detailFields,
    }),
    [path.join(pageDir, "page.tsx")]: createListPageFile({
      modelName,
      modelCamel,
      routeSegment,
      routePascal,
      tableFields,
    }),
    [path.join(pageDir, "[id]", "page.tsx")]: createDetailPageFile({
      modelName,
      modelCamel,
      modelLower,
      routeSegment,
      routePascal,
    }),
    [path.join(pageDir, "create", "page.tsx")]: createCreatePageFile({
      modelName,
      modelCamel,
      routeSegment,
      routePascal,
    }),
    [path.join(pageDir, "[id]", "edit", "page.tsx")]: createEditPageFile({
      modelName,
      modelCamel,
      modelLower,
      routeSegment,
      routePascal,
    }),
  };

  Object.entries(files).forEach(([targetPath, content]) => {
    writeFileRespectingDirective(targetPath, content, force);
  });
}

function createOverridesFile({ modelName, modelCamel, editableFields }) {
  const widgetDefaults = editableFields.length
    ? editableFields
        .map((field) => `    // "${field.name}": "${toFormFieldType(field)}",`)
        .join("\n")
    : "    // \"fieldName\": \"text\",";

  const validatorDefaults = editableFields.length
    ? editableFields
        .map((field) => `    // "${field.name}": ${toZodType(field, field.optional)},`)
        .join("\n")
    : "    // \"fieldName\": z.string().min(1),";

  return `import { z } from "zod";

export type CrudFieldWidget = "text" | "email" | "number" | "textarea" | "checkbox";

export type ${modelName}CrudOverrides = {
  hiddenFields: string[];
  readonlyFields: string[];
  fieldWidgets: Record<string, CrudFieldWidget>;
  validators: Record<string, z.ZodTypeAny>;
};

export const ${modelCamel}CrudOverrides: ${modelName}CrudOverrides = {
  hiddenFields: [],
  readonlyFields: [],
  fieldWidgets: {
${widgetDefaults}
  },
  validators: {
${validatorDefaults}
  },
};
`;
}

function createTypesFile({ modelName, fields, editableFields, routePascal }) {
  const modelFields = fields
    .map((field) => {
      const optional = field.optional || field.analysis.optionalByUnion ? "?" : "";
      return `  ${field.name}${optional}: ${toApiType(field.analysis)};`;
    })
    .join("\n");

  const createFields = editableFields.length
    ? editableFields
        .map((field) => {
          const optional = field.optional || field.analysis.optionalByUnion ? "?" : "";
          return `  ${field.name}${optional}: ${toApiType(field.analysis)};`;
        })
        .join("\n")
    : "  // Add editable fields when your model exposes scalar columns.";

  return `export type SortDirection = "asc" | "desc";

export type PaginationMetadata = {
  pageSize: number;
  count: number;
  pageCount: number;
  pageNumber: number;
};

export type PaginatedData<T> = {
  items: T[];
};

export type PaginatedResponse<T> = {
  metadata: PaginationMetadata;
  data: PaginatedData<T>;
};

export type List${routePascal}Params = {
  page?: number;
  pageNumber?: number;
  pageSize?: number;
  limit?: number;
  offset?: number;
  search?: string;
  sortField?: string;
  sortDirection?: SortDirection;
};

export type ${modelName} = {
${modelFields}
};

export type Create${modelName}Input = {
${createFields}
};

export type Update${modelName}Input = Partial<Create${modelName}Input>;
`;
}

function createApiFile({ modelName, routeSegment, routePascal }) {
  const functionPrefix = capitalize(routeSegment);
  return `import { apiClient } from "@/lib/api/client";

import type {
  Create${modelName}Input,
  List${routePascal}Params,
  PaginatedResponse,
  Update${modelName}Input,
  ${modelName},
} from "./types";

const RESOURCE_PATH = "/${routeSegment}";

export async function list${functionPrefix}(params: List${routePascal}Params = {}) {
  const response = await apiClient.get<PaginatedResponse<${modelName}>>(RESOURCE_PATH, {
    params: params as List${routePascal}Params,
  });
  return response.data;
}

export async function get${modelName}(id: string) {
  const response = await apiClient.get<${modelName}>(RESOURCE_PATH + "/" + id);
  return response.data;
}

export async function create${modelName}(payload: Create${modelName}Input) {
  const response = await apiClient.post<${modelName}>(RESOURCE_PATH, payload);
  return response.data;
}

export async function update${modelName}(id: string, payload: Update${modelName}Input) {
  const response = await apiClient.patch<${modelName}>(RESOURCE_PATH + "/" + id, payload);
  return response.data;
}

export async function delete${modelName}(id: string) {
  const response = await apiClient.delete<${modelName}>(RESOURCE_PATH + "/" + id);
  return response.data;
}
`;
}

function createQueryKeysFile({ routeSegment, routePascal }) {
  return `import type { List${routePascal}Params } from "./types";

export const ${toCamelCase(routeSegment)}QueryKeys = {
  all: ["${routeSegment}"] as const,
  lists: () => [...${toCamelCase(routeSegment)}QueryKeys.all, "list"] as const,
  list: (params = {} as List${routePascal}Params) =>
    [...${toCamelCase(routeSegment)}QueryKeys.lists(), params] as const,
  details: () => [...${toCamelCase(routeSegment)}QueryKeys.all, "detail"] as const,
  detail: (id: string) => [...${toCamelCase(routeSegment)}QueryKeys.details(), id] as const,
};
`;
}

function createHooksFile({ modelName, routeSegment, routePascal }) {
  const functionPrefix = capitalize(routeSegment);
  const keysName = `${toCamelCase(routeSegment)}QueryKeys`;

  return `import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  create${modelName},
  delete${modelName},
  get${modelName},
  list${functionPrefix},
  update${modelName},
} from "./api";
import { ${keysName} } from "./query-keys";
import type {
  Create${modelName}Input,
  List${routePascal}Params,
  PaginatedResponse,
  Update${modelName}Input,
  ${modelName},
} from "./types";

function patchListItems(
  current: PaginatedResponse<${modelName}> | undefined,
  updater: (items: ${modelName}[]) => ${modelName}[],
  countDelta = 0
): PaginatedResponse<${modelName}> | undefined {
  if (!current) return current;

  const nextItems = updater(current.data.items);
  return {
    ...current,
    metadata: {
      ...current.metadata,
      count: Math.max(0, current.metadata.count + countDelta),
    },
    data: {
      ...current.data,
      items: nextItems,
    },
  };
}

export function use${functionPrefix}(
  params: List${routePascal}Params = {},
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ${keysName}.list(params),
    queryFn: () => list${functionPrefix}(params),
    enabled: options?.enabled ?? true,
  });
}

export function useInfinite${functionPrefix}(
  params: Omit<List${routePascal}Params, "page" | "pageNumber" | "offset"> = {},
  options?: { enabled?: boolean }
) {
  return useInfiniteQuery({
    queryKey: ${keysName}.list(params),
    initialPageParam: 1,
    queryFn: ({ pageParam }: { pageParam: number }) =>
      list${functionPrefix}({
        ...params,
        pageNumber: pageParam,
      }),
    getNextPageParam: (lastPage) => {
      const nextPageNumber = lastPage.metadata.pageNumber + 1;
      return nextPageNumber <= lastPage.metadata.pageCount ? nextPageNumber : undefined;
    },
    enabled: options?.enabled ?? true,
  });
}

export function use${modelName}(id?: string) {
  return useQuery({
    queryKey: ${keysName}.detail(id || ""),
    queryFn: () => get${modelName}(id as string),
    enabled: Boolean(id),
  });
}

export function useCreate${modelName}() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Create${modelName}Input) => create${modelName}(payload),
    onMutate: async (payload: Create${modelName}Input) => {
      await queryClient.cancelQueries({ queryKey: ${keysName}.lists() });
      const previousLists = queryClient.getQueriesData<PaginatedResponse<${modelName}>>({
        queryKey: ${keysName}.lists(),
      });

      const optimisticItem = {
        id: "temp-" + Date.now(),
        ...payload,
      } as unknown as ${modelName};

      queryClient.setQueriesData<PaginatedResponse<${modelName}>>(
        { queryKey: ${keysName}.lists() },
        (current) => patchListItems(current, (items) => [optimisticItem, ...items], 1)
      );

      return { previousLists };
    },
    onError: (_error, _payload, context) => {
      (context?.previousLists ?? []).forEach(([queryKey, previous]) => {
        queryClient.setQueryData(queryKey, previous);
      });
    },
    onSuccess: (created) => {
      if ((created as { id?: string }).id) {
        queryClient.setQueryData(
          ${keysName}.detail((created as { id: string }).id),
          created
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ${keysName}.lists() });
    },
  });
}

export function useUpdate${modelName}() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Update${modelName}Input }) =>
      update${modelName}(id, payload),
    onMutate: async (variables: { id: string; payload: Update${modelName}Input }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ${keysName}.lists() }),
        queryClient.cancelQueries({ queryKey: ${keysName}.detail(variables.id) }),
      ]);

      const previousLists = queryClient.getQueriesData<PaginatedResponse<${modelName}>>({
        queryKey: ${keysName}.lists(),
      });
      const previousDetail = queryClient.getQueryData<${modelName}>(
        ${keysName}.detail(variables.id)
      );

      queryClient.setQueryData(
        ${keysName}.detail(variables.id),
        previousDetail
          ? ({ ...previousDetail, ...variables.payload } as ${modelName})
          : previousDetail
      );

      queryClient.setQueriesData<PaginatedResponse<${modelName}>>(
        { queryKey: ${keysName}.lists() },
        (current) =>
          patchListItems(current, (items) =>
            items.map((item) =>
              String((item as { id?: unknown }).id) === variables.id
                ? ({ ...item, ...variables.payload } as ${modelName})
                : item
            )
          )
      );

      return { previousLists, previousDetail };
    },
    onError: (_error, variables, context) => {
      (context?.previousLists ?? []).forEach(([queryKey, previous]) => {
        queryClient.setQueryData(queryKey, previous);
      });
      if (context?.previousDetail !== undefined) {
        queryClient.setQueryData(${keysName}.detail(variables.id), context.previousDetail);
      }
    },
    onSuccess: (result, variables) => {
      queryClient.setQueryData(${keysName}.detail(variables.id), result);
    },
    onSettled: (_result, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: ${keysName}.lists() });
      queryClient.invalidateQueries({ queryKey: ${keysName}.detail(variables.id) });
    },
  });
}

export function useDelete${modelName}() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => delete${modelName}(id),
    onMutate: async (id: string) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ${keysName}.lists() }),
        queryClient.cancelQueries({ queryKey: ${keysName}.detail(id) }),
      ]);

      const previousLists = queryClient.getQueriesData<PaginatedResponse<${modelName}>>({
        queryKey: ${keysName}.lists(),
      });
      const previousDetail = queryClient.getQueryData<${modelName}>(${keysName}.detail(id));

      queryClient.setQueriesData<PaginatedResponse<${modelName}>>(
        { queryKey: ${keysName}.lists() },
        (current) =>
          patchListItems(
            current,
            (items) =>
              items.filter((item) => String((item as { id?: unknown }).id) !== id),
            -1
          )
      );
      queryClient.removeQueries({ queryKey: ${keysName}.detail(id) });

      return { previousLists, previousDetail };
    },
    onError: (_error, id, context) => {
      (context?.previousLists ?? []).forEach(([queryKey, previous]) => {
        queryClient.setQueryData(queryKey, previous);
      });
      if (context?.previousDetail !== undefined) {
        queryClient.setQueryData(${keysName}.detail(id), context.previousDetail);
      }
    },
    onSettled: (_result, _error, id) => {
      queryClient.invalidateQueries({ queryKey: ${keysName}.lists() });
      queryClient.removeQueries({ queryKey: ${keysName}.detail(id) });
    },
  });
}
`;
}

function createConfigFile({ modelName, modelCamel, editableFields, tableFields, detailFields }) {
  const schemaFields = editableFields.length
    ? editableFields.map((field) => `  "${field.name}": ${toZodType(field, field.optional)},`).join("\n")
    : "  // Add model-specific form fields here.\n";

  const baseFormFields = editableFields.length
    ? editableFields
        .map(
          (field) =>
            `  { name: "${field.name}", label: "${toLabel(field.name)}", type: "${toFormFieldType(field)}" },`
        )
        .join("\n")
    : "  // { name: \"fieldName\", label: \"Field Name\", type: \"text\" },";

  const tableColumns = tableFields
    .map((field) => `  { key: "${field.name}", header: "${toLabel(field.name)}" },`)
    .join("\n");

  const detailFieldRows = detailFields
    .map((field) => `  { key: "${field.name}", label: "${toLabel(field.name)}" },`)
    .join("\n");

  const defaultAssignments = editableFields.length
    ? editableFields
        .map((field) => {
          const fallback = toDefaultValue(field);
          return `    ${field.name}: record?.${field.name} ?? ${fallback},`;
        })
        .join("\n")
    : "";

  return `import { z } from "zod";

import type { CrudDetailField, CrudFormField, CrudTableColumn } from "@workspace/ui";
import { ${modelCamel}CrudOverrides } from "./overrides";

import type { ${modelName} } from "./types";

const baseCreate${modelName}SchemaShape: Record<string, z.ZodTypeAny> = {
${schemaFields}
};

const create${modelName}SchemaShape = Object.fromEntries(
  Object.entries(baseCreate${modelName}SchemaShape).map(([fieldName, schema]) => [
    fieldName,
    ${modelCamel}CrudOverrides.validators[fieldName] ?? schema,
  ])
);

export const create${modelName}Schema = z.object(create${modelName}SchemaShape);

export const update${modelName}Schema = create${modelName}Schema;

export type ${modelName}FormValues = z.infer<typeof create${modelName}Schema>;

const base${modelName}FormFields: CrudFormField<${modelName}FormValues>[] = [
${baseFormFields}
];

export const ${modelCamel}FormFields: CrudFormField<${modelName}FormValues>[] = base${modelName}FormFields
  .filter((field) => !${modelCamel}CrudOverrides.hiddenFields.includes(String(field.name)))
  .map((field) => {
    const fieldName = String(field.name);
    return {
      ...field,
      type: ${modelCamel}CrudOverrides.fieldWidgets[fieldName] ?? field.type,
      disabled: field.disabled || ${modelCamel}CrudOverrides.readonlyFields.includes(fieldName),
    };
  });

export const ${modelCamel}TableColumns: CrudTableColumn<${modelName}>[] = [
${tableColumns}
];

export const ${modelCamel}DetailFields: CrudDetailField<${modelName}>[] = [
${detailFieldRows}
];

export function to${modelName}FormValues(
  record?: Partial<${modelName}>
): Partial<${modelName}FormValues> {
  return {
${defaultAssignments}
  };
}
`;
}

function createListPageFile({ modelName, modelCamel, routeSegment, routePascal, tableFields }) {
  const previewFields = tableFields.slice(0, 3).map((field) => field.name);
  const previewRender = previewFields
    .map(
      (fieldName) =>
        `                <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">${toLabel(
          fieldName
        )}:</span> {String(row.${fieldName} ?? "-")}</p>`
    )
    .join("\n");

  return `"use client";

import * as React from "react";
import Link from "next/link";

import { Button, CrudList, CrudTable } from "@workspace/ui";

import { ${modelCamel}TableColumns } from "@/lib/${routeSegment}/config";
import { use${routePascal}, useInfinite${routePascal} } from "@/lib/${routeSegment}/hooks";
import { crudUiConfig } from "@/lib/crud/ui-config";

const DEFAULT_PAGE_SIZE = 25;

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Unable to load ${routeSegment}.";
}

export default function ${routePascal}Page() {
  const isInfiniteMode = crudUiConfig.listMode === "infinite";
  const [pageNumber, setPageNumber] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(DEFAULT_PAGE_SIZE);

  const tableQuery = use${routePascal}(
    {
      pageNumber,
      pageSize,
    },
    { enabled: !isInfiniteMode }
  );

  const infiniteQuery = useInfinite${routePascal}(
    {
      pageSize,
    },
    { enabled: isInfiniteMode }
  );

  const tableRows = tableQuery.data?.data?.items ?? [];
  const infiniteRows = React.useMemo(
    () => (infiniteQuery.data?.pages ?? []).flatMap((page) => page.data?.items ?? []),
    [infiniteQuery.data]
  );
  const rows = isInfiniteMode ? infiniteRows : tableRows;

  const activeLoading = isInfiniteMode ? infiniteQuery.isLoading : tableQuery.isLoading;
  const activeError = isInfiniteMode ? infiniteQuery.error : tableQuery.error;
  const metadata = tableQuery.data?.metadata ?? {
    pageNumber,
    pageSize,
    pageCount: 1,
    count: rows.length,
  };

  return (
    <main className={crudUiConfig.containerClassName}>
      <div className={crudUiConfig.contentClassName}>
        <CrudList
          title="${routePascal}"
          description="Browse and manage ${routeSegment}."
          isLoading={activeLoading}
          error={activeError ? getErrorMessage(activeError) : null}
          isEmpty={rows.length === 0}
          infiniteScroll={
            isInfiniteMode
              ? {
                  hasMore: Boolean(infiniteQuery.hasNextPage),
                  isLoadingMore: infiniteQuery.isFetchingNextPage,
                  onLoadMore: () => infiniteQuery.fetchNextPage(),
                }
              : undefined
          }
          actions={
            <Button asChild>
              <Link href="/${routeSegment}/create">Create ${modelName}</Link>
            </Button>
          }
        >
          {isInfiniteMode ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {rows.map((row, index) => (
                <article
                  key={String(row.id ?? index)}
                  className="rounded-lg border bg-card p-4 shadow-sm"
                >
${previewRender || "                  <p className=\"text-sm text-muted-foreground\">No preview fields configured.</p>"}
                  <div className="mt-3">
                    <Button asChild variant="outline" size="sm">
                      <Link href={"/${routeSegment}/" + String(row.id ?? "")}>View</Link>
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <CrudTable
              rows={rows}
              pagination={metadata}
              onPageChange={setPageNumber}
              onPageSizeChange={(nextPageSize) => {
                setPageSize(nextPageSize);
                setPageNumber(1);
              }}
              isPageLoading={tableQuery.isFetching}
              columns={[
                ...${modelCamel}TableColumns,
                {
                  key: "actions",
                  header: "Actions",
                  render: (row) => (
                    <Button asChild variant="outline" size="sm">
                      <Link href={"/${routeSegment}/" + String(row.id ?? "")}>View</Link>
                    </Button>
                  ),
                },
              ]}
            />
          )}
        </CrudList>
      </div>
    </main>
  );
}
`;
}

function createDetailPageFile({ modelName, modelCamel, modelLower, routeSegment, routePascal }) {
  return `"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { Button, CrudDetail } from "@workspace/ui";

import { ${modelCamel}DetailFields } from "@/lib/${routeSegment}/config";
import { use${modelName} } from "@/lib/${routeSegment}/hooks";
import { crudUiConfig } from "@/lib/crud/ui-config";

function getParamId(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unable to load ${modelName}.";
}

export default function ${modelName}DetailPage() {
  const params = useParams();
  const id = getParamId(params?.id);
  const { data, isLoading, error } = use${modelName}(id);

  return (
    <main className={crudUiConfig.containerClassName}>
      <div className={crudUiConfig.contentClassName}>
        <CrudDetail
          title="${modelName} details"
          description="Inspect ${modelLower} attributes and metadata."
          data={data}
          fields={${modelCamel}DetailFields}
          isLoading={isLoading}
          error={error ? getErrorMessage(error) : null}
        />

        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/${routeSegment}">Back to ${routePascal}</Link>
          </Button>
          <Button asChild>
            <Link href={"/${routeSegment}/" + id + "/edit"}>Edit ${modelName}</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
`;
}

function createCreatePageFile({ modelName, modelCamel, routeSegment }) {
  return `"use client";

import { useRouter } from "next/navigation";

import { CrudForm } from "@workspace/ui";

import {
  create${modelName}Schema,
  ${modelCamel}FormFields,
  type ${modelName}FormValues,
  to${modelName}FormValues,
} from "@/lib/${routeSegment}/config";
import { useCreate${modelName} } from "@/lib/${routeSegment}/hooks";
import { crudUiConfig } from "@/lib/crud/ui-config";

export default function Create${modelName}Page() {
  const router = useRouter();
  const createMutation = useCreate${modelName}();

  return (
    <main className={crudUiConfig.containerClassName}>
      <div className={crudUiConfig.contentClassName}>
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">Create ${modelName}</h1>
          <p className="text-muted-foreground">Add a new ${modelName.toLowerCase()} record.</p>
        </header>

        <CrudForm
          schema={create${modelName}Schema}
          fields={${modelCamel}FormFields}
          defaultValues={to${modelName}FormValues()}
          formStyle={crudUiConfig.formStyle}
          isSubmitting={createMutation.isPending}
          onSubmit={async (values: ${modelName}FormValues) => {
            const created = await createMutation.mutateAsync(values);
            if (created?.id) {
              router.push("/${routeSegment}/" + created.id);
              return;
            }
            router.push("/${routeSegment}");
          }}
          onCancel={() => router.push("/${routeSegment}")}
        />
      </div>
    </main>
  );
}
`;
}

function createEditPageFile({ modelName, modelCamel, modelLower, routeSegment }) {
  return `"use client";

import { useParams, useRouter } from "next/navigation";

import { CrudForm } from "@workspace/ui";

import {
  ${modelCamel}FormFields,
  type ${modelName}FormValues,
  to${modelName}FormValues,
  update${modelName}Schema,
} from "@/lib/${routeSegment}/config";
import { use${modelName}, useUpdate${modelName} } from "@/lib/${routeSegment}/hooks";
import { crudUiConfig } from "@/lib/crud/ui-config";

function getParamId(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default function Edit${modelName}Page() {
  const router = useRouter();
  const params = useParams();
  const id = getParamId(params?.id);
  const { data, isLoading } = use${modelName}(id);
  const updateMutation = useUpdate${modelName}();

  return (
    <main className={crudUiConfig.containerClassName}>
      <div className={crudUiConfig.contentClassName}>
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">Edit ${modelName}</h1>
          <p className="text-muted-foreground">Update this ${modelLower} record.</p>
        </header>

        {isLoading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : (
          <CrudForm
            schema={update${modelName}Schema}
            fields={${modelCamel}FormFields}
            defaultValues={to${modelName}FormValues(data ?? undefined)}
            formStyle={crudUiConfig.formStyle}
            isSubmitting={updateMutation.isPending}
            submitLabel="Save changes"
            onSubmit={async (values: ${modelName}FormValues) => {
              await updateMutation.mutateAsync({ id, payload: values });
              router.push("/${routeSegment}/" + id);
            }}
            onCancel={() => router.push("/${routeSegment}/" + id)}
          />
        )}
      </div>
    </main>
  );
}
`;
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
      `Contract model not found for ${modelName} at ${contractPath}. Run database contract generation first.`
    );
  }

  const source = fs.readFileSync(contractPath, "utf8");
  const ast = ts.createSourceFile(contractPath, source, ts.ScriptTarget.Latest, true);
  const printer = ts.createPrinter({ removeComments: true });

  const fields = [];

  ast.forEachChild((node) => {
    if (!ts.isClassDeclaration(node) || !node.name || node.name.text !== modelName) return;

    node.members.forEach((member) => {
      if (!ts.isPropertyDeclaration(member) || !member.name || !ts.isIdentifier(member.name)) return;
      const type = member.type
        ? printer.printNode(ts.EmitHint.Unspecified, member.type, ast).trim()
        : "unknown";

      fields.push({
        name: member.name.text,
        type,
        optional: Boolean(member.questionToken),
      });
    });
  });

  if (!fields.length) {
    throw new Error(`Could not parse class fields for ${modelName} in ${contractPath}`);
  }

  return fields;
}

function readAllPrismaModelNames() {
  const prismaDir = path.join(repoRoot, "packages", "database", "prisma");
  if (!fs.existsSync(prismaDir)) {
    throw new Error(`Prisma directory not found at ${prismaDir}.`);
  }

  const prismaFiles = listFilesRecursively(prismaDir).filter((filePath) =>
    filePath.endsWith(".prisma")
  );
  const modelNamePattern = /^\s*model\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{/gm;
  const names = [];

  prismaFiles.forEach((filePath) => {
    const source = fs.readFileSync(filePath, "utf8");
    let match = modelNamePattern.exec(source);
    while (match) {
      names.push(match[1]);
      match = modelNamePattern.exec(source);
    }
    modelNamePattern.lastIndex = 0;
  });

  return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
}

function listFilesRecursively(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  entries.forEach((entry) => {
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursively(absolutePath));
      return;
    }
    files.push(absolutePath);
  });

  return files;
}

function analyzeFieldType(typeText) {
  const compact = String(typeText || "")
    .replace(/\s+/g, "")
    .replace(/[()]/g, "");

  let normalized = compact;
  let array = false;

  if (normalized.endsWith("[]")) {
    array = true;
    normalized = normalized.slice(0, -2);
  }

  const arrayMatch = normalized.match(/^Array<(.+)>$/);
  if (arrayMatch) {
    array = true;
    normalized = arrayMatch[1];
  }

  const optionalByUnion =
    normalized.includes("|null") ||
    normalized.includes("null|") ||
    normalized.includes("|undefined") ||
    normalized.includes("undefined|");

  normalized = normalized.replace(/\|null/g, "").replace(/null\|/g, "");
  normalized = normalized.replace(/\|undefined/g, "").replace(/undefined\|/g, "");

  const lower = normalized.toLowerCase();

  let kind = "unknown";
  if (["string", "uuid", "cuid"].includes(lower)) {
    kind = "string";
  } else if (["number", "int", "float", "decimal", "bigint"].includes(lower)) {
    kind = "number";
  } else if (["boolean", "bool"].includes(lower)) {
    kind = "boolean";
  } else if (["date", "datetime"].includes(lower)) {
    kind = "date";
  }

  return {
    kind,
    array,
    optionalByUnion,
  };
}

function toApiType(analysis) {
  const base =
    analysis.kind === "number"
      ? "number"
      : analysis.kind === "boolean"
        ? "boolean"
        : analysis.kind === "date"
          ? "string"
          : analysis.kind === "string"
            ? "string"
            : "unknown";

  return analysis.array ? `${base}[]` : base;
}

function toZodType(field, isOptional) {
  const kind = field.analysis.kind;
  let baseSchema;

  if (kind === "number") {
    baseSchema = "z.coerce.number()";
  } else if (kind === "boolean") {
    baseSchema = "z.boolean()";
  } else if (kind === "date") {
    baseSchema = "z.string().min(1, \"Required\")";
  } else {
    baseSchema = "z.string().min(1, \"Required\")";
  }

  if (field.analysis.array) {
    baseSchema = `z.array(${baseSchema})`;
  }

  if (isOptional || field.analysis.optionalByUnion) {
    return `${baseSchema}.optional()`;
  }

  return baseSchema;
}

function toFormFieldType(field) {
  if (field.analysis.kind === "number") return "number";
  if (field.analysis.kind === "boolean") return "checkbox";
  if (field.analysis.kind === "string" && field.name.toLowerCase().includes("email")) return "email";
  return "text";
}

function toDefaultValue(field) {
  if (field.analysis.kind === "boolean") return "false";
  if (field.analysis.kind === "number") return "undefined";
  if (field.analysis.kind === "date") return "\"\"";
  return "\"\"";
}

function toLabel(value) {
  return String(value)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (first) => first.toUpperCase());
}

function normalizeUiPreset(input) {
  const normalized = String(input || "default").toLowerCase();
  if (["default", "compact", "spacious"].includes(normalized)) return normalized;
  throw new Error('Invalid --ui-preset value. Use "default", "compact", or "spacious".');
}

function normalizeLayout(input) {
  const normalized = String(input || "table").toLowerCase();
  if (["table", "cards", "split-detail"].includes(normalized)) return normalized;
  throw new Error('Invalid --layout value. Use "table", "cards", or "split-detail".');
}

function normalizeListMode(input) {
  const normalized = String(input || "table").toLowerCase();
  if (["table", "infinite"].includes(normalized)) return normalized;
  throw new Error('Invalid --list-mode value. Use "table" or "infinite".');
}

function normalizeFormStyle(input) {
  const normalized = String(input || "stacked").toLowerCase();
  if (["stacked", "two-column"].includes(normalized)) return normalized;
  throw new Error('Invalid --form-style value. Use "stacked" or "two-column".');
}

function hasNoAutoUpdateDirective(content) {
  return /^\s*\/\*_\s*no-auto-update\s*_\*\//.test(String(content || ""));
}

function writeFileRespectingDirective(targetPath, content, force) {
  if (fs.existsSync(targetPath)) {
    const current = fs.readFileSync(targetPath, "utf8");
    if (hasNoAutoUpdateDirective(current)) {
      return;
    }

    if (!force) {
      return;
    }
  }

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, content, "utf8");
}

function toCamelCase(input) {
  return String(input)
    .replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ""))
    .replace(/^(.)/, (first) => first.toLowerCase());
}

function toPascalCase(input) {
  const camel = toCamelCase(input);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

function kebabCase(input) {
  return String(input)
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}

function pluralizeWord(input) {
  if (/[^aeiou]y$/i.test(input)) {
    return `${input.slice(0, -1)}ies`;
  }

  if (/(s|x|z|ch|sh)$/i.test(input)) {
    return `${input}es`;
  }

  return `${input}s`;
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

if (require.main === module) {
  main();
}

module.exports = {
  analyzeFieldType,
  createTypesFile,
  hasNoAutoUpdateDirective,
  kebabCase,
  pluralizeWord,
  readAllPrismaModelNames,
  readContractFields,
  resolveThemeImportPath,
  normalizeListMode,
  toCamelCase,
  toPascalCase,
  toZodType,
  writeFileRespectingDirective,
};
