#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { repoRoot, parseCliFlags } = require("./_shared/utils");
const ts = loadTypeScript();

function main() {
  try {
    const flags = parseCliFlags({ app: "api", force: true });
    const appName = flags.app || flags.appName;
    const modelsInput = flags.models || flags.model || flags.entity;

    if (!appName) {
      throw new Error('Provide a Nest app name with "--app <name>".');
    }

    if (!modelsInput) {
      throw new Error(
        'Provide at least one model with "--model <Model>" or "--models ModelA,ModelB".'
      );
    }

    const models = String(modelsInput)
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    const appDir = path.join(repoRoot, "apps", appName);
    if (!fs.existsSync(appDir)) {
      throw new Error(`App not found at ${appDir}`);
    }

    ensureWorkspaceDependency({ appDir, dependencyName: "nest-helpers" });

    runDbGenerate();

    models.forEach((modelNameRaw) => {
      const modelName = toPascalCase(modelNameRaw);
      const resourceName = flags.resource
        ? kebabCase(flags.resource)
        : pluralizeWord(kebabCase(modelName));

      scaffoldCrudResource({
        appName,
        appDir,
        modelName,
        resourceName,
        force: Boolean(flags.force),
      });
    });

    console.log(
      `[api-updator] Added CRUD scaffolding for ${models
        .map(toPascalCase)
        .join(", ")} in apps/${appName}`
    );
  } catch (error) {
    console.error(`[api-updator] ${error.message}`);
    process.exit(1);
  }
}

function loadTypeScript() {
  const candidates = [
    "typescript",
    path.join(repoRoot, "packages", "config", "node_modules", "typescript"),
    path.join(repoRoot, "packages", "auth", "node_modules", "typescript"),
    path.join(repoRoot, "packages", "database", "node_modules", "typescript"),
    path.join(repoRoot, "packages", "nest-helpers", "node_modules", "typescript"),
  ];

  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch (error) {
      continue;
    }
  }

  throw new Error(
    'Could not resolve "typescript" for api-updator. Run "pnpm install" at the repo root.'
  );
}

function runDbGenerate() {
  try {
    execSync("pnpm --filter database db:generate", {
      cwd: repoRoot,
      stdio: "inherit",
    });
  } catch (error) {
    throw new Error(`Failed to run "pnpm --filter database db:generate" (${error.message})`);
  }
}

function ensureWorkspaceDependency({ appDir, dependencyName }) {
  const packageJsonPath = path.join(appDir, "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    console.warn(
      `[api-updator] package.json not found at ${packageJsonPath}; skipping dependency update for ${dependencyName}.`
    );
    return;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  const hasDependency = Boolean(
    packageJson.dependencies?.[dependencyName] ||
      packageJson.devDependencies?.[dependencyName] ||
      packageJson.peerDependencies?.[dependencyName]
  );

  if (hasDependency) return;

  packageJson.dependencies = {
    ...(packageJson.dependencies || {}),
    [dependencyName]: "workspace:*",
  };

  fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");
  console.log(
    `[api-updator] Added workspace dependency "${dependencyName}" to apps/${path.basename(
      appDir
    )}/package.json`
  );
}

function scaffoldCrudResource({ appName, appDir, modelName, resourceName, force }) {
  const resourceDir = path.join(appDir, "src", resourceName);
  const modelSlug = kebabCase(modelName);

  ensureResourceDir({ appName, resourceName, resourceDir });

  const prismaFields = readPrismaCreateFields(modelName);
  const contractFields = readContractFields(modelName);

  const createDtoPath = path.join(resourceDir, "dto", `create-${modelSlug}.dto.ts`);
  const updateDtoPath = path.join(resourceDir, "dto", `update-${modelSlug}.dto.ts`);
  const paginationQueryDtoPath = path.join(resourceDir, "dto", "pagination-query.dto.ts");
  const entityPath = path.join(resourceDir, "entities", `${modelSlug}.entity.ts`);
  const servicePath = path.join(resourceDir, `${resourceName}.service.ts`);
  const controllerPath = path.join(resourceDir, `${resourceName}.controller.ts`);
  const modulePath = path.join(resourceDir, `${resourceName}.module.ts`);

  writeFileRespectingDirective(
    createDtoPath,
    buildDtoContent({ modelName, prismaFields, contractFields }),
    force
  );
  writeFileRespectingDirective(
    updateDtoPath,
    buildUpdateDtoContent(modelName, createDtoPath),
    force
  );
  writeFileRespectingDirective(
    paginationQueryDtoPath,
    buildPaginationQueryDtoContent(),
    force
  );
  writeFileRespectingDirective(entityPath, buildEntityContent(modelName), force);
  writeFileRespectingDirective(
    servicePath,
    buildServiceContent({ modelName, resourceName }),
    force
  );
  writeFileRespectingDirective(
    controllerPath,
    buildControllerContent({ modelName, resourceName }),
    force
  );
  writeFileRespectingDirective(
    modulePath,
    buildModuleContent({ modelName, resourceName }),
    force
  );

  registerModuleInAppModule({
    appDir,
    moduleName: `${toPascalCase(resourceName)}Module`,
    modulePath,
  });
}

function ensureResourceDir({ appName, resourceName, resourceDir }) {
  try {
    execSync(
      `pnpm --filter ${appName} nest g resource ${resourceName} --crud --type rest --no-spec`,
      {
        cwd: repoRoot,
        stdio: "ignore",
      }
    );
  } catch (error) {
    console.warn(
      `[api-updator] nest generate resource ${resourceName} failed or is unavailable (${error.message}). Falling back to direct file templates.`
    );
  }

  fs.mkdirSync(resourceDir, { recursive: true });
  fs.mkdirSync(path.join(resourceDir, "dto"), { recursive: true });
  fs.mkdirSync(path.join(resourceDir, "entities"), { recursive: true });
}

function readPrismaCreateFields(modelName) {
  const prismaModelPath = path.join(repoRoot, "packages", "database", "client", "prisma", "models", `${modelName}.ts`);
  if (!fs.existsSync(prismaModelPath)) {
    throw new Error(
      `Prisma model for ${modelName} not found at ${prismaModelPath}. Did db:generate run successfully?`
    );
  }

  const source = fs.readFileSync(prismaModelPath, "utf8");
  const ast = ts.createSourceFile(prismaModelPath, source, ts.ScriptTarget.Latest, true);
  const printer = ts.createPrinter({ removeComments: true });
  const targetTypeName = `${modelName}UncheckedCreateInput`;
  const fields = [];

  ast.forEachChild((node) => {
    if (!ts.isTypeAliasDeclaration(node) || node.name.text !== targetTypeName) return;
    if (!ts.isTypeLiteralNode(node.type)) return;

    node.type.members.forEach((member) => {
      if (!ts.isPropertySignature(member) || !member.name || !member.type) return;
      if (!ts.isIdentifier(member.name)) return;

      fields.push({
        name: member.name.text,
        optional: Boolean(member.questionToken),
        type: printer.printNode(ts.EmitHint.Unspecified, member.type, ast).trim(),
      });
    });
  });

  if (!fields.length) {
    throw new Error(`Could not parse ${targetTypeName} from ${prismaModelPath}`);
  }

  return fields;
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
    throw new Error(`Contract for ${modelName} not found at ${contractPath}`);
  }

  const source = fs.readFileSync(contractPath, "utf8");
  const ast = ts.createSourceFile(contractPath, source, ts.ScriptTarget.Latest, true);
  const fields = [];

  ast.forEachChild((node) => {
    if (!ts.isClassDeclaration(node) || !node.name || node.name.text !== modelName) return;

    node.members.forEach((member) => {
      if (!ts.isPropertyDeclaration(member) || !member.name) return;
      if (!ts.isIdentifier(member.name)) return;

      fields.push({
        name: member.name.text,
        optional: Boolean(member.questionToken),
      });
    });
  });

  if (!fields.length) {
    throw new Error(`No fields found on contract class ${modelName} at ${contractPath}`);
  }

  return fields;
}

function buildDtoContent({ modelName, prismaFields, contractFields }) {
  const contractFieldNames = new Set(contractFields.map((field) => field.name));

  const isComplexPrismaType = (field) => field.type.includes("Prisma.");

  const safeContractFields = prismaFields.filter(
    (field) => !isComplexPrismaType(field) && contractFieldNames.has(field.name)
  );
  const requiredContractFields = safeContractFields
    .filter((field) => !field.optional)
    .map((field) => field.name);
  const optionalContractFields = safeContractFields
    .filter((field) => field.optional)
    .map((field) => field.name);

  const excludedContractFields = contractFields
    .map((field) => field.name)
    .filter((name) => !safeContractFields.some((field) => field.name === name));

  const prismaOnlyFields = prismaFields.filter(
    (field) => isComplexPrismaType(field) || !contractFieldNames.has(field.name)
  );

  const swaggerImports = new Set(["PartialType"]);
  if (excludedContractFields.length) swaggerImports.add("OmitType");
  if (requiredContractFields.length || optionalContractFields.length) swaggerImports.add("PickType");
  if (requiredContractFields.length && optionalContractFields.length) {
    swaggerImports.add("IntersectionType");
  }

  const importsLine = `import { ${Array.from(swaggerImports).sort().join(", ")} } from "@nestjs/swagger";`;

  const baseClassName = `${modelName}ContractBase`;
  const requiredBaseName = `Required${modelName}Fields`;
  const optionalBaseName = `Optional${modelName}Fields`;

  const baseClass = excludedContractFields.length
    ? `class ${baseClassName} extends OmitType(${modelName}Contract, [${asQuotedList(
        excludedContractFields
      )}] as const) {}\n`
    : `class ${baseClassName} extends ${modelName}Contract {}\n`;

  const requiredBase = requiredContractFields.length
    ? `class ${requiredBaseName} extends PickType(${baseClassName}, [${asQuotedList(
        requiredContractFields
      )}] as const) {}\n`
    : `class ${requiredBaseName} {}\n`;

  const optionalBase = optionalContractFields.length
    ? `class ${optionalBaseName} extends PartialType(PickType(${baseClassName}, [${asQuotedList(
        optionalContractFields
      )}] as const)) {}\n`
    : `class ${optionalBaseName} {}\n`;

  const createBase = (() => {
    if (requiredContractFields.length && optionalContractFields.length) {
      return `IntersectionType(${requiredBaseName}, ${optionalBaseName})`;
    }
    if (requiredContractFields.length) return requiredBaseName;
    if (optionalContractFields.length) return optionalBaseName;
    return baseClassName;
  })();

  const prismaOnlyProps = prismaOnlyFields
    .map((field) => `  ${field.name}${field.optional ? "?" : ""}: ${field.type};`)
    .join("\n");

  return `${importsLine}
import { Prisma } from "database/client/prisma/client";
import { ${modelName} as ${modelName}Contract } from "database/contracts/models/${modelName}.model";

type PrismaCreateInput = Prisma.${modelName}UncheckedCreateInput;

${baseClass}
${requiredBase}${optionalBase}
export class Create${modelName}Dto extends ${createBase} implements PrismaCreateInput {
${prismaOnlyProps ? `${prismaOnlyProps}\n` : ""}}

`;
}

function buildUpdateDtoContent(modelName) {
  return `import { PartialType } from "@nestjs/swagger";
import { Prisma } from "database/client/prisma/client";
import { Create${modelName}Dto } from "./create-${kebabCase(modelName)}.dto";

export class Update${modelName}Dto
  extends PartialType(Create${modelName}Dto)
  implements Prisma.${modelName}UncheckedUpdateInput {}
`;
}

function buildEntityContent(modelName) {
  return `import { ${modelName} } from "database/contracts/models/${modelName}.model";

export class ${modelName}Entity implements ${modelName} {}
`;
}

function buildPaginationQueryDtoContent() {
  return `import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";

export class PaginationQueryDto {
  @ApiPropertyOptional({
    description: "1-based page number",
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageNumber?: number;

  @ApiPropertyOptional({
    description: "Alias for pageNumber",
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: "Items per page",
    minimum: 1,
    maximum: 100,
    default: 25,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @ApiPropertyOptional({
    description: "Alias for pageSize",
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: "Absolute row offset; overrides page/pageNumber when provided",
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
`;
}

function buildServiceContent({ modelName, resourceName }) {
  const resourceClassName = toPascalCase(resourceName);
  const prismaProperty = toCamelCase(modelName);
  const dtoBase = kebabCase(modelName);

  return `import { Injectable } from "@nestjs/common";
import { createPaginatedResponse, paginate } from "nest-helpers";
import { PrismaService } from "../database/prisma.service";
import { Create${modelName}Dto } from "./dto/create-${dtoBase}.dto";
import { PaginationQueryDto } from "./dto/pagination-query.dto";
import { Update${modelName}Dto } from "./dto/update-${dtoBase}.dto";

@Injectable()
export class ${resourceClassName}Service {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Create${modelName}Dto) {
    return this.prisma.${prismaProperty}.create({ data });
  }

  async findAll(query: PaginationQueryDto) {
    const pagination = paginate(query);
    const [items, count] = await Promise.all([
      this.prisma.${prismaProperty}.findMany({
        skip: pagination.offset,
        take: pagination.limit,
      }),
      this.prisma.${prismaProperty}.count(),
    ]);

    return createPaginatedResponse(items, count, pagination);
  }

  findOne(id: string) {
    return this.prisma.${prismaProperty}.findUnique({ where: { id } });
  }

  update(id: string, data: Update${modelName}Dto) {
    return this.prisma.${prismaProperty}.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.${prismaProperty}.delete({ where: { id } });
  }
}
`;
}

function buildControllerContent({ modelName, resourceName }) {
  const resourceClassName = toPascalCase(resourceName);
  const routePath = resourceName.toLowerCase();
  const dtoBase = kebabCase(modelName);

  return `import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiCreatedResponse, ApiExtraModels, ApiOkResponse, ApiTags, getSchemaPath } from "@nestjs/swagger";
import { ${modelName} } from "database/contracts/models/${modelName}.model";
import { Create${modelName}Dto } from "./dto/create-${dtoBase}.dto";
import { PaginationQueryDto } from "./dto/pagination-query.dto";
import { Update${modelName}Dto } from "./dto/update-${dtoBase}.dto";
import { ${resourceClassName}Service } from "./${resourceName}.service";

@ApiTags("${modelName}")
@ApiExtraModels(${modelName})
@Controller("${routePath}")
export class ${resourceClassName}Controller {
  constructor(private readonly ${toCamelCase(resourceName)}Service: ${resourceClassName}Service) {}

  @Post()
  @ApiCreatedResponse({ type: ${modelName} })
  create(@Body() create${modelName}Dto: Create${modelName}Dto) {
    return this.${toCamelCase(resourceName)}Service.create(create${modelName}Dto);
  }

  @Get()
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: {
        metadata: {
          type: "object",
          properties: {
            pageSize: { type: "number" },
            count: { type: "number" },
            pageCount: { type: "number" },
            pageNumber: { type: "number" },
          },
          required: ["pageSize", "count", "pageCount", "pageNumber"],
        },
        data: {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: { $ref: getSchemaPath(${modelName}) },
            },
          },
          required: ["items"],
        },
      },
      required: ["metadata", "data"],
    },
  })
  findAll(@Query() query: PaginationQueryDto) {
    return this.${toCamelCase(resourceName)}Service.findAll(query);
  }

  @Get(":id")
  @ApiOkResponse({ type: ${modelName} })
  findOne(@Param("id") id: string) {
    return this.${toCamelCase(resourceName)}Service.findOne(id);
  }

  @Patch(":id")
  @ApiOkResponse({ type: ${modelName} })
  update(@Param("id") id: string, @Body() update${modelName}Dto: Update${modelName}Dto) {
    return this.${toCamelCase(resourceName)}Service.update(id, update${modelName}Dto);
  }

  @Delete(":id")
  @ApiOkResponse({ type: ${modelName} })
  remove(@Param("id") id: string) {
    return this.${toCamelCase(resourceName)}Service.remove(id);
  }
}
`;
}

function buildModuleContent({ modelName, resourceName }) {
  const resourceClassName = toPascalCase(resourceName);

  return `import { Module } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { ${resourceClassName}Controller } from "./${resourceName}.controller";
import { ${resourceClassName}Service } from "./${resourceName}.service";

@Module({
  controllers: [${resourceClassName}Controller],
  providers: [${resourceClassName}Service, PrismaService],
})
export class ${resourceClassName}Module {}
`;
}

function registerModuleInAppModule({ appDir, moduleName, modulePath }) {
  const appModulePath = path.join(appDir, "src", "app.module.ts");
  if (!fs.existsSync(appModulePath)) {
    console.warn(`[api-updator] app.module.ts not found at ${appModulePath}; skipping module registration.`);
    return;
  }

  const existing = fs.readFileSync(appModulePath, "utf8");
  if (hasNoAutoUpdateDirective(existing)) {
    console.warn(
      `[api-updator] Skipped updating app.module.ts (no-auto-update directive present).`
    );
    return;
  }

  const relativeImportPath = `./${path
    .relative(path.join(appDir, "src"), modulePath)
    .replace(/\\/g, "/")
    .replace(/\.ts$/, "")}`;

  let updated = existing;
  const importStatement = `import { ${moduleName} } from "${relativeImportPath}";`;

  if (!existing.includes(importStatement)) {
    updated = `${importStatement}\n${updated}`;
  }

  if (updated.includes(moduleName) && updated === existing) {
    return;
  }

  const moduleMatch = updated.match(/@Module\s*\(\s*\{([\s\S]*?)\}\s*\)/);
  if (!moduleMatch) {
    console.warn(
      `[api-updator] Could not locate @Module metadata in app.module.ts; please add ${moduleName} manually.`
    );
    fs.writeFileSync(appModulePath, updated, "utf8");
    return;
  }

  const moduleBlock = moduleMatch[1];
  let updatedModuleBlock = moduleBlock;

  const importsMatch = moduleBlock.match(/imports\s*:\s*\[([\s\S]*?)\]/);
  if (importsMatch) {
    const importsValue = importsMatch[1];
    if (!importsValue.includes(moduleName)) {
      const trimmed = importsValue.trim();
      const separator = trimmed && !trimmed.endsWith(",") ? ", " : "";
      const newImports = `${importsValue}${separator}${moduleName}`;
      updatedModuleBlock = moduleBlock.replace(importsMatch[0], `imports: [${newImports}]`);
    }
  } else {
    const indent = (moduleBlock.match(/^\s*/) || ["  "])[0];
    const insertion = `${indent}imports: [${moduleName}],\n`;
    updatedModuleBlock = `${insertion}${moduleBlock}`;
  }

  const finalContent = updated.replace(moduleBlock, updatedModuleBlock);
  fs.writeFileSync(appModulePath, finalContent, "utf8");
}

function writeFileRespectingDirective(filePath, content, force) {
  if (fs.existsSync(filePath)) {
    const existing = fs.readFileSync(filePath, "utf8");
    if (hasNoAutoUpdateDirective(existing)) {
      console.warn(
        `[api-updator] Skipped ${path.relative(repoRoot, filePath)} (no-auto-update directive present).`
      );
      return;
    }
    if (!force) {
      console.warn(
        `[api-updator] Skipped ${path.relative(
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

function hasNoAutoUpdateDirective(content) {
  return content.trimStart().startsWith("/*_ no-auto-update _*/");
}

function asQuotedList(list) {
  return list.map((item) => `"${item}"`).join(", ");
}

function toPascalCase(value) {
  const camel = toCamelCase(value);
  return camel ? camel[0].toUpperCase() + camel.slice(1) : "";
}

function toCamelCase(value) {
  return value
    .replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ""))
    .replace(/^(.)/, (char) => char.toLowerCase());
}

function kebabCase(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[_\s]+/g, "-")
    .toLowerCase();
}

function pluralizeWord(value) {
  if (value.endsWith("ch") || value.endsWith("sh")) return `${value}es`;
  if (/[sxz]$/.test(value)) return `${value}es`;
  if (/[^aeiou]y$/.test(value)) return `${value.slice(0, -1)}ies`;
  return `${value}s`;
}

main();
